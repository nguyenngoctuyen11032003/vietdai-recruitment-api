import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseEntities } from './database/entities';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const shouldEnableDatabase =
  process.env.NODE_ENV !== 'test' || Boolean(process.env.DATABASE_URL);
const migrationGlob = __filename.endsWith('.ts')
  ? 'src/database/migrations/*.ts'
  : 'dist/database/migrations/*.js';

const databaseImports = shouldEnableDatabase
  ? [
      TypeOrmModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          type: 'postgres',
          url: configService.get<string>('DATABASE_URL'),
          ssl: configService.get<boolean>('DB_SSL', false)
            ? { rejectUnauthorized: false }
            : false,
          logging: configService.get<boolean>('DB_LOGGING', false),
          synchronize: false,
          migrationsRun: configService.get<boolean>('DB_RUN_MIGRATIONS', false),
          entities: databaseEntities,
          migrations: [migrationGlob],
        }),
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    ...databaseImports,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
