#!/bin/sh
set -e
mkdir -p /app/.data
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /app/.data
  exec su-exec nextjs:nodejs "$@"
fi
exec "$@"
