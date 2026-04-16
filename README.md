# xkld-be

Backend NestJS + PostgreSQL with TypeORM migrations.

## 1) Setup

```bash
npm install
copy .env.example .env
```

Update `.env` values to match your DB.

## 2) Environment variables

Required in non-test environments:

- `DATABASE_URL` (example: `postgres://postgres:postgres@localhost:5432/xkld`)

Optional:

- `NODE_ENV` (`development` | `test` | `production`)
- `PORT` (default `3001`)
- `DB_SSL` (`true`/`false`, default `false`)
- `DB_LOGGING` (`true`/`false`, default `false`)
- `DB_RUN_MIGRATIONS` (`true`/`false`, default `false`)

## 3) Migration commands

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

Create migration file template:

```bash
npm run migration:create --name=1740000000005-YourMigrationName
```

Generate migration from entity changes:

```bash
npm run migration:generate --name=1740000000005-YourMigrationName
```

## 4) Run backend

```bash
npm run start:dev
```

Server starts on `http://localhost:3001` by default.

## 5) Production deploy checklist

1. Set all production env vars (`DATABASE_URL`, `DB_SSL`, `NODE_ENV=production`).
2. Build app: `npm run build`.
3. Run migrations: `npm run migration:run`.
4. Start service: `npm run start:prod`.

If you want app startup to auto-run migrations, set `DB_RUN_MIGRATIONS=true`.
