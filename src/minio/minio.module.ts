import { Global, Module } from "@nestjs/common";
import { MinioClientProvider } from "./minio-client.provider";
import { MinioInitService } from "./minio-init.service";


@Global()
@Module({
  providers: [MinioClientProvider, MinioInitService],
  exports: [MinioClientProvider],
})
export class MinioModule {}