import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseEntities } from './entities';

const isTsRuntime = __filename.endsWith('.ts');
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

if (!hasDatabaseUrl) {
  // Keep a predictable failure for migration commands when env is missing.
  throw new Error('DATABASE_URL is required to run TypeORM migrations');
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: databaseEntities,
  migrations: [
    isTsRuntime
      ? 'src/database/migrations/*.ts'
      : 'dist/database/migrations/*.js',
  ],
});

