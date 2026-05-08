import { MigrationInterface, QueryRunner } from "typeorm";

export class BuildTrackerTable1777396668043 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      queryRunner.query(`
          CREATE TABLE "builds" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "repoId" character varying NOT NULL,
          "username" character varying NOT NULL,
          "name" character varying NOT NULL,
          "version" character varying NOT NULL,
          "status" character varying NOT NULL DEFAULT 'pending',
          "logs" text,
          "errorMessage" character varying,
          "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "finishedAt" TIMESTAMP,
          "type" character varying NOT NULL DEFAULT 'repo',
          CONSTRAINT "PK_builds" PRIMARY KEY ("id")
        )
      `)
      await queryRunner.query(`CREATE INDEX "IDX_builds_repoId" ON "builds" ("repoId")`);
      await queryRunner.query(`CREATE INDEX "IDX_builds_username" ON "builds" ("username")`);
      await queryRunner.query(`CREATE INDEX "IDX_builds_status" ON "builds" ("status")`);
      await queryRunner.query(`CREATE INDEX "IDX_builds_startedAt" ON "builds" ("startedAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX "IDX_builds_startedAt"`);
      await queryRunner.query(`DROP INDEX "IDX_builds_status"`);
      await queryRunner.query(`DROP INDEX "IDX_builds_username"`);
      await queryRunner.query(`DROP INDEX "IDX_builds_repoId"`);
      await queryRunner.query(`DROP TABLE "builds"`);
    }

}
