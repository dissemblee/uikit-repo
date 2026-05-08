import { Injectable, Logger } from '@nestjs/common';
import { BuildService } from './build-service.interface';
import { BuildOptions } from '../models/build-options.interface';
import { ComponentService } from 'src/component/component.service';
import { create, extract, Unpack } from 'tar';
import tmp from 'tmp';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import fs from 'node:fs';
import babel from '@rollup/plugin-babel';
import { rollup } from 'rollup';
import { InjectMinio } from 'src/minio/minio.decorator';
import { Client as MinioClient } from 'minio';
import { MINIO_REPO_BUCKET } from 'src/minio/constants';
import { BuildTrackerService } from './build-tracker.service';
import { createLogPlugin } from './createLogPlugin';

@Injectable()
export class RollupBuildService extends BuildService {

  private readonly logger = new Logger(RollupBuildService.name);

  constructor(
    private readonly componentService: ComponentService,
    @InjectMinio() private readonly minio: MinioClient,
    private buildTracker: BuildTrackerService,
  ) {
    super();
  }

  async buildAndSave(options: BuildOptions & { buildId: string }) {
    const { buildId, username, name, version } = options;
    const repoId = `${username}/${name}-${version}`;

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleDebug = console.debug;

    try {
      await this.buildTracker.appendLog(buildId, `Starting build: ${repoId}`);

      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;

      const captureLog = (msg: any, level: 'info' | 'warn' | 'error' | 'debug' = 'info') => {
        try {
          const message =
            typeof msg === 'string'
              ? msg
              : msg?.message || JSON.stringify(msg, null, 2);

          this.buildTracker.appendLog(buildId, message, level).catch((e) => {
            originalConsoleError('Failed to save log:', e);
          });
        } catch (e) {
          originalConsoleError('Log capture error:', e);
        }
      };

      console.log = (...args: any[]) => {
        originalConsoleLog(...args);
        captureLog(args.join(' '), 'info');
      };

      console.error = (...args: any[]) => {
        originalConsoleError(...args);
        captureLog(args.join(' '), 'error');
      };

      console.warn = (...args: any[]) => {
        originalConsoleWarn(...args);
        captureLog(args.join(' '), 'warn');
      };

      console.debug = (...args: any[]) => {
        originalConsoleDebug(...args);
        captureLog(args.join(' '), 'debug');
      };

      await this.loadComponents(tmpDir, options);
      await this.buildTracker.appendLog(buildId, 'Components loaded and extracted');

      const componentsPackagesJson = this.getComponentsPackagesJson(tmpDir, options);
      await this.buildTracker.appendLog(buildId, 'Components package.json processed');

      this.createPackageJson({
        tmpDir,
        options,
        componentsPackagesJson,
      });
      await this.buildTracker.appendLog(buildId, 'Root package.json created');

      const bundle = await rollup({
        input: this.getEntry(tmpDir, options),
        plugins: [nodeResolve(), commonjs(), createLogPlugin(buildId, this.buildTracker),],
        onLog(level: 'warn' | 'info' | 'debug', log: any) {
          let prefix = '[Rollup]';
          let logLevel: 'info' | 'warn' | 'error' | 'debug' = 'info';

          if (level === 'warn') {
            prefix = '[Rollup Warning]';
            logLevel = 'warn';
          } else if (level === 'debug') {
            prefix = '[Rollup Debug]';
            logLevel = 'debug';
          }

          const message = log.message || JSON.stringify(log, null, 2);
          console[logLevel === 'warn' ? 'warn' : 'log'](`${prefix} ${message}`);
        },
        onwarn: (warning, warn) => {
          const message =
            warning.message || JSON.stringify(warning, null, 2);

          console.warn(`[Rollup WARN] ${message}`);
          this.buildTracker.appendLog(buildId, message, 'warn');
          
          warn(warning);
        },
      });

      await this.buildTracker.appendLog(buildId, 'Rollup bundle created');

      await bundle.write({
        dir: path.join(tmpDir, 'dist'),
        format: 'esm',
        exports: 'named',
        preserveModules: true,
        preserveModulesRoot: path.join(tmpDir, 'lib', 'src'),
        sourcemap: true,
      });

      await this.buildTracker.appendLog(buildId, 'Bundle written to dist folder');

      fs.copyFileSync(
        path.join(tmpDir, 'lib', 'package.json'),
        path.join(tmpDir, 'dist', 'package.json'),
      );

      await create(
        {
          gzip: true,
          file: path.join(tmpDir, 'tar.tgz'),
          portable: true,
          strict: true,
          cwd: path.join(tmpDir, 'dist'),
        },
        ['.'],
      );

      await this.buildTracker.appendLog(buildId, 'Tarball created');

      const stream = fs.createReadStream(path.join(tmpDir, 'tar.tgz'));
      await this.minio.putObject(MINIO_REPO_BUCKET, repoId, stream);

      await this.buildTracker.appendLog(buildId, `Successfully uploaded to MinIO: ${repoId}`);

      fs.rmSync(tmpDir, { recursive: true, force: true });
      await bundle.close();

      await this.buildTracker.appendLog(buildId, `Build completed successfully!`, 'info');

      return {
        version: options.version,
        components: options.components,
        name: options.name,
        username: options.username,
        id: repoId,
      };
    } catch (error: any) {
      const errorMessage = error.message || error.toString();
      await this.buildTracker.appendLog(buildId, `Build failed: ${errorMessage}`, 'error');
      this.logger.error(`Build ${repoId} failed`, error);
      throw error;
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.debug = originalConsoleDebug;
    }
  }

  private getEntry(tmpDir: string, options: BuildOptions) {
    let entry = {};
    for (const meta of options.components) {
      entry[meta.name] = path.join(
        tmpDir,
        'lib',
        'src',
        meta.username,
        meta.name,
        'index.js',
      );
    }
    return entry;
  }

  private async loadComponents(tmpDir: string, buildOptions: BuildOptions) {
    const promises: Promise<void>[] = [];
    this.logger.log(JSON.stringify(buildOptions));
    for (const meta of buildOptions.components) {
      const component = await this.componentService.readComponent(meta.id);

      const componentDir = path.join(
        tmpDir,
        'lib',
        'src',
        meta.username,
        meta.name,
      );
      fs.mkdirSync(componentDir, { recursive: true });
      const pipe = component.pipe(extract({ cwd: componentDir }));
      const finishedExtract = finished(pipe);
      
      promises.push(finishedExtract);
    }
    
    await Promise.all(promises).then(() => {this.logger.log(`components extracted`)});
  }

  private getComponentsPackagesJson(tmpDir: string, options: BuildOptions) {
    const packagesJson: any[] = [];
    for (const meta of options.components) {
      const packageDir = path.join(
        tmpDir,
        'lib',
        'src',
        meta.username,
        meta.name,
        'package.json',
      );

      const packageJson = JSON.parse(fs.readFileSync(packageDir, 'utf-8'));

      packagesJson.push(packageJson);
    }

    return packagesJson;
  }

  private getTsconfigJson(options: BuildOptions): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2023',
        module: 'ESNext',
        strict: true,
        moduleResolution: 'Node',
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src'],
    });
  }

  private createPackageJson(args: {
    tmpDir: string;
    options: BuildOptions;
    componentsPackagesJson: any[];
  }) {
    const { tmpDir, options, componentsPackagesJson } = args;
    const packageJson = this.getPackageJson(options, componentsPackagesJson);
    fs.writeFileSync(
      path.join(tmpDir, 'lib', 'package.json'),
      packageJson,
      'utf8',
    );
  }

  private getPackageJson(
    options: BuildOptions,
    componentsPackagesJson: any[],
  ): string {
    let dependencies = {};
    for (const componentPackage of componentsPackagesJson) {
      const packageDependencies = componentPackage.dependencies;
      for (const key of Object.keys(packageDependencies)) {
        dependencies[key] = packageDependencies[key];
      }
    }

    return JSON.stringify({
      name: options.name,
      private: true,
      version: options.version,
      type: 'module',
      dependencies,
    });
  }

  private createIndexesForComponents(tmpDir: string, options: BuildOptions) {
    const usernames = {};
    for (const meta of options.components) {
      if (!usernames[meta.username]) {
        usernames[meta.username] = [];
      }
      if (!usernames[meta.username].includes(meta.name)) {
        usernames[meta.username].push(meta.name);
      }
    }
    let index = '';
    for (const username of Object.keys(usernames)) {
      let usernameIndex = '';
      for (const name of usernames[username]) {
        usernameIndex += `import * as ${name}__base from './${name}';\n`;
        usernameIndex += `import ${name} from './${name}'\n`;
      }
      usernameIndex += `export default {\n`;
      for (const name of usernames[username]) {
        usernameIndex += `${name},\n`;
        usernameIndex += `...${name}__base,\n`;
      }
      usernameIndex += `};\n`;
      fs.writeFileSync(
        path.join(tmpDir, 'lib', 'src', username, 'index.js'),
        usernameIndex,
        'utf-8',
      );
      index += `import ${username} from './${username}';\n`;
      index += `export { ${username} };\n`;
    }
    fs.writeFileSync(
      path.join(tmpDir, 'lib', 'src', 'index.js'),
      index,
      'utf-8',
    );
  }
}
