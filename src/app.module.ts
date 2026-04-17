import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseEntities } from './database/entities';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { BackendAppService } from './app.service';
import { LocalMediaStorageProvider } from './media/local-media-storage.provider';
import { MEDIA_STORAGE_PROVIDER } from './media/storage.provider';
import { S3MediaStorageProvider } from './media/s3-media-storage.provider';

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
  providers: [
    BackendAppService,
    LocalMediaStorageProvider,
    S3MediaStorageProvider,
    {
      provide: MEDIA_STORAGE_PROVIDER,
      inject: [ConfigService, LocalMediaStorageProvider, S3MediaStorageProvider],
      useFactory: (
        configService: ConfigService,
        localProvider: LocalMediaStorageProvider,
        s3Provider: S3MediaStorageProvider,
      ) => {
        const driver = configService
          .get<string>('MEDIA_STORAGE_DRIVER', 'local')
          .toLowerCase();

        return driver === 's3' ? s3Provider : localProvider;
      },
    },
  ],
})
export class AppModule {}
