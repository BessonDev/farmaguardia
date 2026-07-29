#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node --import tsx src/db/migrate.ts

echo "[entrypoint] Starting server..."
exec node ./dist/server/entry.mjs
