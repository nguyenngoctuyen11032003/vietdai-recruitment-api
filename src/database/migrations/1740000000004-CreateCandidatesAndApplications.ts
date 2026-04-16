import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCandidatesAndApplications1740000000004
  implements MigrationInterface
{
  name = 'CreateCandidatesAndApplications1740000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "candidates" (
        "id" BIGSERIAL PRIMARY KEY,
        "full_name" VARCHAR(120) NOT NULL,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "phone_number" VARCHAR(20),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "applications" (
        "id" BIGSERIAL PRIMARY KEY,
        "job_id" BIGINT NOT NULL,
        "candidate_id" BIGINT NOT NULL,
        "reviewer_id" BIGINT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'submitted',
        "note" TEXT,
        "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_applications_job_candidate" UNIQUE ("job_id", "candidate_id"),
        CONSTRAINT "fk_applications_job"
          FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_applications_candidate"
          FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_applications_reviewer"
          FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "applications" ("status");',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_applications_applied_at" ON "applications" ("applied_at");',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_applications_applied_at";');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_applications_status";');
    await queryRunner.query('DROP TABLE IF EXISTS "applications";');
    await queryRunner.query('DROP TABLE IF EXISTS "candidates";');
  }
}

