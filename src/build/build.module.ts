import { Module } from "@nestjs/common";
import { ComponentModule } from "src/component/component.module";
import { BuildService } from "./services/build-service.interface";
import { RollupBuildService } from "./services/rollup-build.service";

@Module({
  imports: [ComponentModule],
  providers: [{
    provide: BuildService,
    useClass: RollupBuildService
  }],
  exports: [BuildService]
})
export class BuildModule {}