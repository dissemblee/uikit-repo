import { Injectable, Logger } from '@nestjs/common';
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
import { BuildOptions } from 'src/build/models/build-options.interface';
import { ComponentType } from 'src/build/models/types';
import { Component } from 'src/postgres/entities/component.entity';

@Injectable()
export class RepoService {
  private readonly logger = new Logger(RepoService.name);

  constructor(
    @InjectMinio() private readonly minioClient: MinioClient,
    @InjectRepository(Repo) private readonly repoRepository: Repository<Repo>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    private readonly buildService: BuildService,
    private readonly componentService: ComponentService,
  ) {}

  async createNewRepo(args: { repo: RepoCreateDto; username: string }) {
    const { repo, username } = args;
    const components = await this.componentService.loadComponentsMeta(
      repo.components,
    );
    this.logger.log(JSON.stringify(components));
    const buildOptions: BuildOptions = {
      version: repo.version,
      components,
      name: repo.name,
      username,
    };

    const result = await this.buildService.buildAndSave(buildOptions);

    let entity = new Repo();
    entity.components = await this.getAndSaveComponents(components);
    entity.description = repo.description;
    entity.id = result.id;
    entity.name = result.name;
    entity.username = result.username;
    entity.version = result.version;

    entity = await this.repoRepository.save(entity);

    return entity;
  }

  async getMany(args: {
    startDate: Date;
    skip?: number;
    limit?: number;
    username?: string;
  }) {
    let qb = this.repoRepository.createQueryBuilder('repo');
    if (args.username)
      qb = qb
        .where('repo.username = :username', { username: args.username })
        .andWhere('repo.createdAt >= :startDate', {
          startDate: args.startDate,
        });
    else
      qb = qb.where('repo.createdAt >= :startDate', {
        startDate: args.startDate,
      });

    if (args.skip) qb = qb.skip(args.skip);

    if (args.limit) qb = qb.take(args.limit);

    const result = await qb.getMany();
    return result;
  }

  async getAll() {
    const result = await this.repoRepository
      .createQueryBuilder('repo')
      .leftJoinAndSelect('repo.components', 'component')
      .getMany();
    return result;
  }

  async getRepoByUser(username: string) {
    const repos = await this.repoRepository
      .createQueryBuilder('repo')
      .where('repo.username = :username', { username })
      .leftJoinAndSelect('repo.components', 'component')
      .getMany();
    return repos;
  }

  private async getAndSaveComponents(meta: ComponentType[]) {
    this.logger.log('meta: ' + JSON.stringify(meta));
    let components = meta.map((m) => {
      const entity = new Component();
      entity.id = m.id;
      entity.version = m.version;

      return entity;
    });
    this.logger.log('entities: ' + JSON.stringify(components));
    components = await this.componentRepository.save(components);

    return components;
  }

  updateRepo(args: { repoId: string; update: RepoUpdateDto }) {
    const { repoId, update } = args;
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
