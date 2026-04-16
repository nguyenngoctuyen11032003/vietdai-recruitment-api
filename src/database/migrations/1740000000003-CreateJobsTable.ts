import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobsTable1740000000003 implements MigrationInterface {
  name = 'CreateJobsTable1740000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "jobs" (
        "id" BIGSERIAL PRIMARY KEY,
        "title" VARCHAR(180) NOT NULL,
        "slug" VARCHAR(220) NOT NULL UNIQUE,
        "location" VARCHAR(120) NOT NULL,
        "salary_min" INTEGER,
        "salary_max" INTEGER,
        "currency" CHAR(3) NOT NULL DEFAULT 'VND',
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "published_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_jobs_salary_range"
          CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max")
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs" ("status");',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_jobs_published_at" ON "jobs" ("published_at");',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_jobs_published_at";');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_jobs_status";');
    await queryRunner.query('DROP TABLE IF EXISTS "jobs";');
  }
}

