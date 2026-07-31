#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node --import tsx src/db/migrate.ts

echo "[entrypoint] Checking if database needs seeding..."
FARMACIAS_COUNT=$(node -e "const D=require('better-sqlite3');const db=new D(process.env.DATABASE_URL??'./data/farmaguardia.db');console.log(db.prepare('SELECT COUNT(*) c FROM farmacias').get().c);db.close();")

if [ "$FARMACIAS_COUNT" = "0" ]; then
  echo "[entrypoint] Database is empty, running seed..."
  node --import tsx src/db/seed.ts
else
  echo "[entrypoint] Database already has data, skipping seed."
fi

echo "[entrypoint] Starting server..."
exec node ./dist/server/entry.mjs
