import { Injectable } from '@nestjs/common';
import { BuildService } from './build-service.interface';
import { BuildOptions } from '../models/build-options.interface';
import { ComponentService } from 'src/component/component.service';
import { extract, Unpack } from 'tar';
import tmp from 'tmp';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import typescript from '@rollup/plugin-typescript'; 
import axios from 'axios';
import resolve, { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import fs from 'node:fs';
import babel from '@rollup/plugin-babel';
import { rollup } from 'rollup';
import { InjectMinio } from 'src/minio/minio.decorator';
import { Client as MinioClient } from 'minio';

@Injectable()
export class RollupBuildService extends BuildService {
  constructor(
    private readonly componentService: ComponentService,
    @InjectMinio() private readonly minio: MinioClient
  ) {
    super();
  }

  async buildAndSave(options: BuildOptions) {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;

    await this.loadComponents(tmpDir, options);

    const componentsPackagesJson = this.getComponentsPackagesJson(
      tmpDir,
      options,
    );

    this.createPackageJson({
      tmpDir,
      options,
      componentsPackagesJson,
    });

    this.createIndexesForComponents(tmpDir, options);

    const bundle = await rollup({
      input: this.getEntry(tmpDir, options),
      plugins: [
        nodeResolve(),
        commonjs(),
      ]
    });

    await bundle.write({
      dir: path.join(tmpDir, 'dist'),
      format: 'esm',
      exports: 'named',
      preserveModules: true,
      preserveModulesRoot: path.join(tmpDir, 'lib', 'src'),
      sourcemap: true
    })

    await bundle.close();

    
  }

  private getEntry(tmpDir: string, options: BuildOptions) {
    let entry = {};
    for (const meta of options.components) {
      entry[meta.name] = path.join(tmpDir, 'lib', 'src', meta.username, meta.name, 'index.js');
    }
    return entry;
  }

  private async loadComponents(tmpDir: string, buildOptions: BuildOptions) {
    const promises: Promise<void>[] = [];
    for (const meta of buildOptions.components) {
      const component = await this.componentService.readComponent(meta.id);

      const componentDir = path.join(
        tmpDir,
        'lib',
        'src',
        meta.username,
        meta.name,
      );

      const pipe = component.pipe(extract({ cwd: componentDir }));

      const finishedExtract = finished(pipe);

      promises.push(finishedExtract);
    }

    await Promise.all(promises);
  }

  private getComponentsPackagesJson(tmpDir: string, options: BuildOptions) {
    const packagesJson: any[] = [];
    for (const meta of options.components) {
      const packageDir = path.join(
        tmpDir,
        'lib',
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
    fs.writeFileSync(path.join(tmpDir, 'lib', 'package.json'), packageJson);
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
