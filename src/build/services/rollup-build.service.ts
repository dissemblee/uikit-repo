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

@Injectable()
export class RollupBuildService extends BuildService {

  private readonly logger = new Logger(RollupBuildService.name);

  constructor(
    private readonly componentService: ComponentService,
    @InjectMinio() private readonly minio: MinioClient,
  ) {
    super();
  }

  async buildAndSave(options: BuildOptions) {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;

    await this.loadComponents(tmpDir, options);

    this.logger.log(`components loaded`);

    const componentsPackagesJson = this.getComponentsPackagesJson(
      tmpDir,
      options,
    );

    this.logger.log(JSON.stringify(componentsPackagesJson));

    this.logger.log(`components packages json created`);

    this.createPackageJson({
      tmpDir,
      options,
      componentsPackagesJson,
    });

    this.logger.log(`package json created`);
    //this.createIndexesForComponents(tmpDir, options);

    const bundle = await rollup({
      input: this.getEntry(tmpDir, options),
      plugins: [nodeResolve(), commonjs()],
    });

    this.logger.log(`bundle created`);
    await bundle.write({
      dir: path.join(tmpDir, 'dist'),
      format: 'esm',
      exports: 'named',
      preserveModules: true,
      preserveModulesRoot: path.join(tmpDir, 'lib', 'src'),
      sourcemap: true,
    });

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

    const stream = fs.createReadStream(path.join(tmpDir, 'tar.tgz'));

    const repoId = `${options.username}/${options.name}-${options.version}`;

    await this.minio.putObject(MINIO_REPO_BUCKET, repoId, stream);

    fs.rmSync(tmpDir, { recursive: true, force: true });

    await bundle.close();

    return {
      version: options.version,
      components: options.components,
      name: options.name,
      username: options.username,
      id: repoId,
    };
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
