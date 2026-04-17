import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokens1745000000008 implements MigrationInterface {
  name = 'CreateRefreshTokens1745000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" BIGINT NOT NULL,
        "token_hash" VARCHAR(255) NOT NULL UNIQUE,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "revoked_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_refresh_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_expires" ON "refresh_tokens" ("user_id", "expires_at");',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_revoked_at" ON "refresh_tokens" ("revoked_at");',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_refresh_tokens_revoked_at";',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_refresh_tokens_user_expires";',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "refresh_tokens";');
  }
}

