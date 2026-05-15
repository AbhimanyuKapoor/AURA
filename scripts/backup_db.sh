#!/bin/bash
set -e

# Default backup directory
BACKUP_DIR="../backups/db"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/aura_db_backup_$TIMESTAMP.sql"

echo "➜ Backing up AURA database..."

# Dump the database inside the container
docker exec -t aura-postgres pg_dump -U aura_user -d aura -F p -f "/tmp/backup.sql"

# Copy the dump out to the host system
docker cp aura-postgres:/tmp/backup.sql "$FILENAME"

# Clean up inside the container
docker exec -t aura-postgres rm /tmp/backup.sql

echo "✓ Backup completed successfully: $FILENAME"
