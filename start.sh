#!/bin/sh
set -e

mkdir -p /app/data

if [ ! -f "$DATABASE_PATH" ]; then
  echo "Initializing database with seed data..."
  node seed.js
  node seed_turnos.js
fi

echo "Starting FarmaGuardia server..."
exec node ./dist/server/entry.mjs
