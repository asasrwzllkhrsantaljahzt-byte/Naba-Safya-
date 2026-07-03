# Naba Safya - Local dev notes

This repo contains an API server and a frontend. Quick start:

1. Copy `.env.example` to `.env` and fill values.

API (local dev):

```
cd artifacts/api-server
pnpm run build
set -o allexport && . .env && set +o allexport && node --enable-source-maps ./dist/index.mjs
```

Frontend (dev):

```
cd artifacts/water-factory
pnpm run dev
```

Docker (quick):

```
docker compose up --build
```

Smoke tests (once API is running locally):

```
node scripts/smoke-test.js
```

Wipe test data safely:

1. Add a secure token to `.env`:

```env
WIPE_TOKEN=your-secret-token
```

2. Preview what would be deleted:

```bash
pnpm run wipe-db -- --dry-run
```

3. Run the wipe with confirmation:

```bash
pnpm run wipe-db -- --confirm=your-secret-token
```
