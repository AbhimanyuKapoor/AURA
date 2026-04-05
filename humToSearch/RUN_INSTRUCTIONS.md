# Hum to Search - Local Development Guide

This document outlines how to run the `backend`, `database`, and `frontend` components of the Hum to Search project.

## Prerequisites
- **Database**: Docker and Docker Compose
- **Backend (Local)**: `pyenv` and `ffmpeg` (installed via the setup script)
- **Frontend**: Node.js and npm

---

## 1. Starting the Database
The backend relies on a PostgreSQL database with the `pgvector` extension. A valid database container is provided in the `flask-api/docker-compose.yml` file.

1. Navigate to the `flask-api` directory:
   ```bash
   cd flask-api
   ```
2. Start the database service:
   ```bash
   docker compose up db -d
   ```
   > This starts the database on port `5433` using the credentials defined in `docker-compose.yml`.

---

## 2. Starting the Backend (Flask API)
You can choose to run the API locally using the provided virtual environment configuration, or via Docker. The local environment approach is usually best for active development.

### Option A: Running Locally (Recommended)
The project includes a robust setup script to initialize a Python 3.11 virtual environment and install FFmpeg if necessary.

1. Navigate to the `flask-api` directory:
   ```bash
   cd flask-api
   ```
2. Run the environment setup script (you only need to do this once):
   ```bash
   ./setup_venv.sh
   ```
3. Start the Flask server with Gunicorn:
   ```bash
   ./start.sh
   ```
   > The backend API will be running and listening at `http://localhost:5000`.

### Option B: Running with Docker
If you want to run everything entirely via Docker alongside the database:
1. Navigate to the `flask-api` directory:
   ```bash
   cd flask-api
   ```
2. Bring up all services:
   ```bash
   docker compose up -d
   ```
   > This builds the API image and runs the entire stack in the background. The API will be exposed on port `5000`.

---

## 3. Starting the Frontend
The frontend uses React with Vite for a fast development experience.

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the necessary packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   > The terminal output will provide the local URL, typically `http://localhost:5173`. Open this URL in your web browser.
