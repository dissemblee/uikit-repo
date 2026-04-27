import { Injectable } from '@nestjs/common';
import { InjectMinio } from 'src/minio/minio.decorator';
import { Client as MinioClient } from 'minio';
import { MINIO_COMPONENTS_BUCKET } from 'src/minio/constants';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ComponentEntityDto } from '@48-iq/uikit-dto-lib';
import { ComponentType } from 'src/build/models/types';
@Injectable()
export class ComponentService {
  constructor(
    private readonly configService: ConfigService,
    @InjectMinio() private readonly minio: MinioClient,
  ) {}

  async readComponent(componentId: string) {
    return this.minio.getObject(MINIO_COMPONENTS_BUCKET, componentId);
  }

  async loadComponentsMeta(components: string[]): Promise<ComponentType[]> {
    
    const response = await axios.get<ComponentEntityDto[]>(
      this.configService.getOrThrow<string>('COMPONENTS_META_URL'),
      {
        params: {
          components,
        },
      },
    );

    return response.data.map((meta) => ({
      id: meta.id,
      name: meta.name,
      username: meta.username,
      version: meta.version,
      framework: meta.framework,
    }));
  }
}
