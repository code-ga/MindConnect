#!/bin/sh
set -e

echo "Running database migrations..."
bun run db:push

echo "Starting application..."
bun run start
