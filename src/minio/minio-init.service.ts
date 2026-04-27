import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectMinio } from './minio.decorator';
import { Client } from 'minio';
import { MINIO_REPO_BUCKET } from './constants';

@Injectable()
export class MinioInitService implements OnApplicationBootstrap {
  constructor(@InjectMinio() private readonly minio: Client) {}

  async onApplicationBootstrap() {
    const isComponentsBucketExists = await this.minio.bucketExists(
      MINIO_REPO_BUCKET,
    );
    if (!isComponentsBucketExists) {
      await this.minio.makeBucket(MINIO_REPO_BUCKET);
    }
  }
}
