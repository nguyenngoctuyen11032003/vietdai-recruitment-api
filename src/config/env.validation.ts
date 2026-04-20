type EnvInput = Record<string, unknown>;

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return fallback;
};

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

export const validateEnv = (config: EnvInput): EnvInput => {
  const isWatchMode = process.argv.includes('--watch');
  const lifecycleEvent = (process.env.npm_lifecycle_event || '').toLowerCase();
  const isDevRun = isWatchMode || lifecycleEvent === 'start:dev';
  const nodeEnv =
    (config.NODE_ENV as string | undefined) ??
    (process.env.JEST_WORKER_ID ? 'test' : 'development');
  const databaseUrl = config.DATABASE_URL as string | undefined;

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  if (!databaseUrl && nodeEnv !== 'test') {
    throw new Error('DATABASE_URL is required outside test environment');
  }

  const port = toNumber(config.PORT, 3001);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const mediaUploadDir =
    (config.MEDIA_UPLOAD_DIR as string | undefined)?.trim() || 'uploads';
  const accessTokenSecret =
    (config.AUTH_ACCESS_TOKEN_SECRET as string | undefined)?.trim() ||
    (config.AUTH_SECRET as string | undefined)?.trim() ||
    'xkld-dev-auth-secret';
  const accessTokenTtlSeconds = toNumber(
    config.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    60 * 15,
  );
  const refreshTokenTtlSeconds = toNumber(
    config.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    60 * 60 * 24 * 30,
  );
  const mediaStorageDriver =
    (config.MEDIA_STORAGE_DRIVER as string | undefined)?.trim().toLowerCase() ||
    'local';
  if (!['local', 's3'].includes(mediaStorageDriver)) {
    throw new Error('MEDIA_STORAGE_DRIVER must be local or s3');
  }

  const mediaPublicBaseUrl =
    (config.MEDIA_PUBLIC_BASE_URL as string | undefined)?.trim() ||
    `http://localhost:${port}/uploads`;

  const mediaMaxFileSizeBytes = toNumber(
    config.MEDIA_MAX_FILE_SIZE_BYTES,
    5 * 1024 * 1024,
  );
  const mediaMaxImageWidth = toNumber(config.MEDIA_MAX_IMAGE_WIDTH, 4096);
  const mediaMaxImageHeight = toNumber(config.MEDIA_MAX_IMAGE_HEIGHT, 4096);
  const mediaMaxImageMegapixels = toNumber(
    config.MEDIA_MAX_IMAGE_MEGAPIXELS,
    16,
  );

  if (
    mediaStorageDriver === 's3' &&
    !(config.S3_BUCKET as string | undefined)?.trim()
  ) {
    throw new Error('S3_BUCKET is required when MEDIA_STORAGE_DRIVER=s3');
  }

  if (
    mediaStorageDriver === 's3' &&
    !(config.S3_REGION as string | undefined)?.trim()
  ) {
    throw new Error('S3_REGION is required when MEDIA_STORAGE_DRIVER=s3');
  }

  if (
    nodeEnv === 'production' &&
    !isDevRun &&
    accessTokenSecret === 'xkld-dev-auth-secret'
  ) {
    throw new Error(
      'AUTH_ACCESS_TOKEN_SECRET (or AUTH_SECRET) must be set in production',
    );
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    DB_SSL: toBoolean(config.DB_SSL, false),
    DB_LOGGING: toBoolean(config.DB_LOGGING, false),
    DB_RUN_MIGRATIONS: toBoolean(config.DB_RUN_MIGRATIONS, false),
    MEDIA_STORAGE_DRIVER: mediaStorageDriver,
    AUTH_ACCESS_TOKEN_SECRET: accessTokenSecret,
    AUTH_ACCESS_TOKEN_TTL_SECONDS: accessTokenTtlSeconds,
    AUTH_REFRESH_TOKEN_TTL_SECONDS: refreshTokenTtlSeconds,
    MEDIA_UPLOAD_DIR: mediaUploadDir,
    MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
    MEDIA_MAX_FILE_SIZE_BYTES: mediaMaxFileSizeBytes,
    MEDIA_MAX_IMAGE_WIDTH: mediaMaxImageWidth,
    MEDIA_MAX_IMAGE_HEIGHT: mediaMaxImageHeight,
    MEDIA_MAX_IMAGE_MEGAPIXELS: mediaMaxImageMegapixels,
    S3_BUCKET: (config.S3_BUCKET as string | undefined)?.trim(),
    S3_REGION: (config.S3_REGION as string | undefined)?.trim(),
    S3_ACCESS_KEY_ID: (config.S3_ACCESS_KEY_ID as string | undefined)?.trim(),
    S3_SECRET_ACCESS_KEY:
      (config.S3_SECRET_ACCESS_KEY as string | undefined)?.trim(),
    S3_SESSION_TOKEN: (config.S3_SESSION_TOKEN as string | undefined)?.trim(),
    S3_MEDIA_PREFIX:
      (config.S3_MEDIA_PREFIX as string | undefined)?.trim() || 'media',
  };
};
