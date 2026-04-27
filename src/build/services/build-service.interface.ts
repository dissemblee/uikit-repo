import { BuildOptions } from '../models/build-options.interface';

export abstract class BuildService {
  abstract buildAndSave(buildOptions: BuildOptions);
}
