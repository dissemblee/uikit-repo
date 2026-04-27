import { Module } from "@nestjs/common";
import { ComponentModule } from "src/component/component.module";
import { RepoModule } from "src/repo/repo.module";

@Module({
  imports: [ComponentModule],
  providers: [BuildModule],
  exports: [RepoModule]
})
export class BuildModule {}