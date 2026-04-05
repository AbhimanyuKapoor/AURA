#!/bin/bash
set -e

# Setup trap to safely kill background processes (backend) when exiting this script
cleanup() {
    echo -e "\n🛑 Stopping all services..."
    # Kill backend
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup EXIT INT TERM

echo "🚀 Starting Hum to Search..."
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

# ==========================================================
# 1. Start Database
# ==========================================================
echo -e "\n[1/3] 🗄️ Starting database..."
cd "$PROJECT_ROOT/flask-api"
docker compose up db -d

# ==========================================================
# 2. Start Backend
# ==========================================================
echo -e "\n[2/3] ⚙️ Starting backend (flask-api)..."
cd "$PROJECT_ROOT/flask-api"

if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Running setup script..."
    ./setup_venv.sh
fi

echo "Running API server via start.sh in the background..."
./start.sh &
BACKEND_PID=$!

# Give the backend a moment to bind to the port
sleep 2

# ==========================================================
# 3. Start Frontend
# ==========================================================
echo -e "\n[3/3] 🖥️ Starting frontend..."
cd "$PROJECT_ROOT/frontend"

# Get the actual user's home directory even if running under sudo
if [ -n "$SUDO_USER" ]; then
    ACTUAL_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    ACTUAL_HOME=$HOME
fi

# Load NVM (Node Version Manager) if installed so npm is found
if [ -s "$ACTUAL_HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$ACTUAL_HOME/.nvm"
    \. "$NVM_DIR/nvm.sh"
fi

if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing frontend dependencies..."
    npm install
fi

echo "Running Vite development server..."
npm run dev

# The script will stay active running the frontend until the user presses Ctrl+C.
# Once interrupted, the trap will execute and kill the background backend process.
