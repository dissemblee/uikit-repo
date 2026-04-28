import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client as MinioClient } from 'minio';
import { RepoNotFoundError } from 'src/errors/repo-not-found.error';
import { MINIO_REPO_BUCKET } from 'src/minio/constants';
import { InjectMinio } from 'src/minio/minio.decorator';
import { Repo } from 'src/postgres/entities/repo.entity';
import { Repository } from 'typeorm';
import { RepoCreateDto, RepoUpdateDto } from '@48-iq/uikit-dto-lib';
import { BuildService } from 'src/build/services/build-service.interface';
import { ComponentService } from 'src/component/component.service';

@Injectable()
export class RepoService {
  constructor(
    @InjectMinio() private readonly minioClient: MinioClient,
    @InjectRepository(Repo) private readonly repoRepository: Repository<Repo>,
    private readonly buildService: BuildService,
    private readonly componentService: ComponentService
  ) {}

  createNewRepo(repo: RepoCreateDto) {

  }

  updateRepo(args: {
    repoId: string;
    update: RepoUpdateDto;
  }) {
    const {repoId, update} = args;

  }

  getRepo(repoId: string) {
    const repo = this.repoRepository.findBy({ id: repoId });
    if (!repo) throw new RepoNotFoundError(`repo with id ${repoId} not found`);
    return repo;
  }

  async getPackage(packageId: string) {
    const file = await this.minioClient.getObject(MINIO_REPO_BUCKET, packageId);
    return file;
  }
}
