import { Injectable } from "@nestjs/common";
import { Repo } from "src/postgres/entities/repo.entity";
import { RepoCursorResultDto, RepoEntityDto} from '@48-iq/uikit-dto-lib';

@Injectable()
export class RepoMapper {
  constructor() {}

  entityToDto(entity: Repo) {
    return new RepoEntityDto({
      id: entity.id,
      description: entity.description,
      components: entity.components.map((c) => c.id),
    });
  }

  entityToDtos(entities: Repo[]) {
    return entities.map((entity) => this.entityToDto(entity));
  }

  toCursorResultDto(entities: Repo[]) {
    const data = this.entityToDtos(entities);
    const result = new RepoCursorResultDto({
      success: true,
      
    })
  }
}