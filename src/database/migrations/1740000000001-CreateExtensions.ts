import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtensions1740000000001 implements MigrationInterface {
  name = 'CreateExtensions1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'Skipping pgcrypto extension: insufficient privilege';
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE EXTENSION IF NOT EXISTS citext;
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'Skipping citext extension: insufficient privilege';
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        DROP EXTENSION IF EXISTS citext;
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'Skipping citext extension drop: insufficient privilege';
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        DROP EXTENSION IF EXISTS pgcrypto;
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'Skipping pgcrypto extension drop: insufficient privilege';
      END
      $$;
    `);
  }
}

