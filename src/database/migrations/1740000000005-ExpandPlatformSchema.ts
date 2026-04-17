import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandPlatformSchema1740000000005 implements MigrationInterface {
  name = 'ExpandPlatformSchema1740000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "phone_number" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "role" VARCHAR(30) NOT NULL DEFAULT 'editor',
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN IF NOT EXISTS "company_name" VARCHAR(180) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "employment_type" VARCHAR(40) NOT NULL DEFAULT 'Full-time',
      ADD COLUMN IF NOT EXISTS "salary_text" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "description" TEXT,
      ADD COLUMN IF NOT EXISTS "responsibilities" TEXT,
      ADD COLUMN IF NOT EXISTS "requirements" TEXT,
      ADD COLUMN IF NOT EXISTS "application_method" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';
    `);

    await queryRunner.query(`
      ALTER TABLE "candidates"
      ADD COLUMN IF NOT EXISTS "current_title" VARCHAR(140),
      ADD COLUMN IF NOT EXISTS "location" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "years_experience" VARCHAR(30);
    `);

    await queryRunner.query(`
      ALTER TABLE "applications"
      ADD COLUMN IF NOT EXISTS "score" INTEGER;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blog_posts" (
        "id" BIGSERIAL PRIMARY KEY,
        "title" VARCHAR(220) NOT NULL,
        "slug" VARCHAR(240) NOT NULL UNIQUE,
        "excerpt" TEXT,
        "content" TEXT,
        "author_name" VARCHAR(140) NOT NULL DEFAULT 'XKLD Team',
        "cover_image_url" VARCHAR(255),
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "views" INTEGER NOT NULL DEFAULT 0,
        "published_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_blog_posts_status" ON "blog_posts" ("status");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media_assets" (
        "id" BIGSERIAL PRIMARY KEY,
        "file_name" VARCHAR(255) NOT NULL,
        "file_url" VARCHAR(255) NOT NULL,
        "mime_type" VARCHAR(120) NOT NULL,
        "size_bytes" BIGINT NOT NULL DEFAULT 0,
        "category" VARCHAR(60) NOT NULL DEFAULT 'general',
        "alt_text" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(200) NOT NULL,
        "period" VARCHAR(120) NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ready',
        "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "generated_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contact_tickets" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(140) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "subject" VARCHAR(220) NOT NULL,
        "message" TEXT NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'new',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_jobs" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" BIGINT NOT NULL,
        "job_id" BIGINT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_saved_jobs_user_job" UNIQUE ("user_id", "job_id"),
        CONSTRAINT "fk_saved_jobs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_saved_jobs_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" BIGINT NOT NULL,
        "title" VARCHAR(220) NOT NULL,
        "detail" TEXT NOT NULL,
        "type" VARCHAR(30) NOT NULL DEFAULT 'system',
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "read_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "is_read");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_notifications_user_read";');
    await queryRunner.query('DROP TABLE IF EXISTS "notifications";');
    await queryRunner.query('DROP TABLE IF EXISTS "saved_jobs";');
    await queryRunner.query('DROP TABLE IF EXISTS "contact_tickets";');
    await queryRunner.query('DROP TABLE IF EXISTS "reports";');
    await queryRunner.query('DROP TABLE IF EXISTS "media_assets";');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_blog_posts_status";');
    await queryRunner.query('DROP TABLE IF EXISTS "blog_posts";');

    await queryRunner.query('ALTER TABLE "applications" DROP COLUMN IF EXISTS "score";');

    await queryRunner.query(`
      ALTER TABLE "candidates"
      DROP COLUMN IF EXISTS "years_experience",
      DROP COLUMN IF EXISTS "location",
      DROP COLUMN IF EXISTS "current_title";
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN IF EXISTS "tags",
      DROP COLUMN IF EXISTS "application_method",
      DROP COLUMN IF EXISTS "requirements",
      DROP COLUMN IF EXISTS "responsibilities",
      DROP COLUMN IF EXISTS "description",
      DROP COLUMN IF EXISTS "salary_text",
      DROP COLUMN IF EXISTS "employment_type",
      DROP COLUMN IF EXISTS "company_name";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "is_verified",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "role",
      DROP COLUMN IF EXISTS "phone_number";
    `);
  }
}

