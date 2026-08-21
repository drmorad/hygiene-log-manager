#!/bin/sh
set -e

echo "▶ Running database migrations..."
# `push` is idempotent: it creates/updates tables to match the schema.
pnpm --filter @workspace/db run push || echo "⚠ Migration step failed — the API will still start, but routes that touch the DB may error until the schema exists."

echo "▶ Starting API server..."
exec node artifacts/api-server/dist/index.mjs
