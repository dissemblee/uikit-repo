import { Module } from "@nestjs/common";
import { RepoService } from "./repo.service";
import { RepoController } from "./repo.controller";
import { ComponentModule } from "src/component/component.module";
import { BuildModule } from "src/build/build.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Repo } from "src/postgres/entities/repo.entity";
import { Component } from "src/postgres/entities/component.entity";
import { RepoMapper } from "./repo.mapper";
import { Build } from "src/postgres/entities/build.entity";

@Module({
  imports: [ComponentModule, BuildModule, TypeOrmModule.forFeature([Repo, Component, Build])],
  controllers: [RepoController],
  providers: [RepoService, RepoMapper],
})
export class RepoModule {}