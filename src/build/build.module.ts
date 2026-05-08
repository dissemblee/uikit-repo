import { Module } from "@nestjs/common";
import { ComponentModule } from "src/component/component.module";
import { BuildService } from "./services/build-service.interface";
import { RollupBuildService } from "./services/rollup-build.service";
import { BuildTrackerService } from "./services/build-tracker.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Build } from "src/postgres/entities/build.entity";

@Module({
  imports: [ComponentModule, TypeOrmModule.forFeature([Build]),],
  providers: [BuildTrackerService,{
    provide: BuildService,
    useClass: RollupBuildService,
  }],
  exports: [BuildService, BuildTrackerService]
})
export class BuildModule {}