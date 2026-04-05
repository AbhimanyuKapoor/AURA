#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "❌ .venv not found. Please run ./setup_venv.sh first."
    exit 1
fi

# Source .env if present (loads DATABASE_URL etc.)
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

cd "$SCRIPT_DIR"
exec "$VENV_DIR/bin/gunicorn" -b 0.0.0.0:5000 --workers 1 --threads 8 --timeout 0 server:app