#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"
PYENV_BIN="$HOME/.pyenv/bin/pyenv"
PYTHON_VERSION="3.11.9"

echo "=== Setting up Python 3.11 venv for flask-api ==="

# ── 1. Ensure pyenv is available ─────────────────────────────────────────────
if ! command -v pyenv &>/dev/null; then
    if [ -x "$PYENV_BIN" ]; then
        export PATH="$HOME/.pyenv/bin:$HOME/.pyenv/shims:$PATH"
        eval "$(pyenv init -)"
    else
        echo "❌ pyenv not found. Install it first: https://github.com/pyenv/pyenv#installation"
        exit 1
    fi
else
    eval "$(pyenv init -)"
fi

# ── 2. Install Python 3.11 via pyenv if not present ──────────────────────────
if ! pyenv versions --bare | grep -q "^${PYTHON_VERSION}$"; then
    echo "Installing Python ${PYTHON_VERSION} via pyenv (compiling from source, this may take a few minutes)..."
    # Install build dependencies
    sudo apt-get install -y --no-install-recommends \
        build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev \
        libsqlite3-dev libncursesw5-dev xz-utils tk-dev libxml2-dev \
        libxmlsec1-dev libffi-dev liblzma-dev
    pyenv install "${PYTHON_VERSION}"
else
    echo "Python ${PYTHON_VERSION} already installed via pyenv."
fi

PYTHON311="$HOME/.pyenv/versions/${PYTHON_VERSION}/bin/python3.11"

# ── 3. Install ffmpeg if not available ───────────────────────────────────────
if ! command -v ffmpeg &>/dev/null; then
    echo "Installing ffmpeg..."
    sudo apt-get install -y ffmpeg
else
    echo "ffmpeg already installed."
fi

# ── 4. Create venv ───────────────────────────────────────────────────────────
if [ -d "$VENV_DIR" ]; then
    echo "Removing existing .venv..."
    rm -rf "$VENV_DIR"
fi

echo "Creating .venv with Python ${PYTHON_VERSION}..."
"$PYTHON311" -m venv "$VENV_DIR"

# ── 5. Install dependencies ──────────────────────────────────────────────────
echo "Installing requirements..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"

echo ""
echo "✅ Setup complete! Virtual environment is at .venv/ (Python ${PYTHON_VERSION})"
echo "   To start the server: ./start.sh"
