import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReposTable1777395957583 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
      CREATE TABLE "repos" (
        "id" char varying NOT NULL,
        "version" char varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        "updatedAt" TIMESTAMP,
        "username" character varying NOT NULL,
        "description" character varying NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_repo_id" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`DROP TABLE "repos";`);
  }
}
