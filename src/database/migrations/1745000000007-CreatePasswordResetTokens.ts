import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokens1745000000007
  implements MigrationInterface
{
  name = 'CreatePasswordResetTokens1745000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" BIGINT NOT NULL,
        "token_hash" VARCHAR(255) NOT NULL UNIQUE,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "used_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_password_reset_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user_expires" ON "password_reset_tokens" ("user_id", "expires_at");',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_expires" ON "password_reset_tokens" ("expires_at");',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_password_reset_tokens_expires";',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_password_reset_tokens_user_expires";',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "password_reset_tokens";');
  }
}

