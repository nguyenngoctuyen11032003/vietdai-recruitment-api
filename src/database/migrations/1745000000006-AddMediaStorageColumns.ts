import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaStorageColumns1745000000006 implements MigrationInterface {
  name = 'AddMediaStorageColumns1745000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      ADD COLUMN IF NOT EXISTS "storage_provider" VARCHAR(40) NOT NULL DEFAULT 'local',
      ADD COLUMN IF NOT EXISTS "storage_key" VARCHAR(255) NOT NULL DEFAULT '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "media_assets"
      DROP COLUMN IF EXISTS "storage_key",
      DROP COLUMN IF EXISTS "storage_provider";
    `);
  }
}

