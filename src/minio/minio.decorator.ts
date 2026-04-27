import { Inject } from "@nestjs/common";
import { MINIO_CLIENT } from "./minio-client.provider";

export function InjectMinio(): ParameterDecorator {
  return Inject(MINIO_CLIENT);
}