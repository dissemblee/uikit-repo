import { Module } from "@nestjs/common";
import { RepoService } from "./repo.service";
import { RepoController } from "./repo.controller";
import { ComponentModule } from "src/component/component.module";
import { BuildModule } from "src/build/build.module";

@Module({
  imports: [ComponentModule, BuildModule],
  controllers: [RepoController],
  providers: [RepoService],
})
export class RepoModule {}