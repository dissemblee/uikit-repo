import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
      TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) =>  {
        return {
          type: 'postgres',
          host: config.getOrThrow<string>('POSTGRES_HOST')!,
          port: +config.getOrThrow<string>('POSTGRES_PORT')!,
          username: config.getOrThrow<string>('POSTGRES_USER')!,
          password: config.getOrThrow<string>('POSTGRES_PASSWORD')!,
          database: config.getOrThrow<string>('POSTGRES_DB')!,
          entities: [__dirname + '/entities/*.entity.{ts,js}'],
          synchronize: false,
          migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
          migrationsRun: true,
        }
      }
    }),
  ],
  exports: [TypeOrmModule]
}) 
export class PostgresModule {}