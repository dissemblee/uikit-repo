import { Injectable } from "@nestjs/common";
import { Repo } from "src/postgres/entities/repo.entity";
import RepoEntityDto from '@48-iq/uikit-dto-lib';

@Injectable()
export class RepoMapper {
  constructor() {}

  entityToDto(entity: Repo) {
    return new RepoEntityDto
  }
}