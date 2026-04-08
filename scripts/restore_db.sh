#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <path/to/backup_file.sql>"
  echo "Example: $0 ../backups/db/aura_db_backup_20260408_120000.sql"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File '$BACKUP_FILE' not found!"
  exit 1
fi

echo "➜ Restoring AURA database from $BACKUP_FILE..."
echo "WARNING: This will overwrite current data. Press Ctrl+C to cancel or wait 5 seconds..."
sleep 5

# Clear existing database by dropping and recreating the public schema
echo "Wiping existing tables..."
docker exec -t aura-postgres psql -U aura_user -d aura -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Pipe the SQL file into the postgres container natively
cat "$BACKUP_FILE" | docker exec -i aura-postgres psql -U aura_user -d aura -q

echo "✓ Restore completed safely!"
