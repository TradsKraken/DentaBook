#!/bin/sh
# Always target the standalone development project, including when the root
# production .env sets COMPOSE_FILE or a shell sets COMPOSE_PROJECT_NAME.
set -eu
workspace=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
configuration="$workspace/.env.development.local"
if [ ! -f "$configuration" ]; then
  echo "Copy .env.development.example to .env.development.local and set DEV_DB_PASSWORD first." >&2
  exit 1
fi
exec docker compose --project-name dentabook-development \
  --env-file "$configuration" \
  --file "$workspace/docker-compose.development.yml" "$@"
