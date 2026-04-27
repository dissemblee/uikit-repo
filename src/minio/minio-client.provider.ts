import { Provider } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as Minio from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT'

export const MinioClientProvider: Provider = {
  provide: MINIO_CLIENT,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const endPoint = configService.getOrThrow<string>('MINIO_HOST');
    const port = +configService.getOrThrow<string>('MINIO_PORT');
    const accessKey = configService.getOrThrow<string>('MINIO_USER');
    const secretKey = configService.getOrThrow<string>('MINIO_PASSWORD');
    return new Minio.Client({ endPoint, port, accessKey, secretKey, useSSL: false });
  }
}