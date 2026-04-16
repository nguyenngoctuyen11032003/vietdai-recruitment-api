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
  const nodeEnv = (config.NODE_ENV as string | undefined) ?? 'development';
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

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    DB_SSL: toBoolean(config.DB_SSL, false),
    DB_LOGGING: toBoolean(config.DB_LOGGING, false),
    DB_RUN_MIGRATIONS: toBoolean(config.DB_RUN_MIGRATIONS, false),
  };
};

