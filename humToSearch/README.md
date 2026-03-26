# Full-Stack Application setup

This project consists of a React frontend and a Python Flask API powered by a PostgreSQL vector database.

## Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Python 3.10+ (if running backend locally without Docker)

## 🐳 Quick Start (Recommended)

The easiest way to run the entire backend is via Docker. This will spin up the Postgres database and the Flask API simultaneously, avoiding any local library compilation issues.

**1. Start the Backend Services**
Navigate to the `flask-api` directory and start the Docker containers.
```bash
cd flask-api
sudo docker-compose up --build -d
```
*The API will run on `http://localhost:5000`*

**2. Start the Frontend**
Open a new terminal, navigate to the `frontend` directory, install dependencies, and start the Vite development server.
```bash
cd frontend
npm install
npm run dev
```
*The Frontend will run on `http://localhost:5173`*

---

## 🛠️ Manual Backend Setup (Without Docker for API)

If you prefer to run the Flask API locally (e.g. for development) instead of using Docker, you still need Docker for the Postgres Database.

**1. Start only the Database**
Modify `docker-compose.yml` to uncomment the API block if you disabled it, or run:
```bash
cd flask-api
sudo docker-compose up db -d
```

**2. Setup Python Virtual Environment**
Ensure you are using Python 3.10+ (Python 3.13 may have issues installing older ML dependencies unless you downgrade to 3.11).
```bash
cd flask-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**3. Run the Flask Server**
```bash
python3 server.py
```

## Troubleshooting
- **Cannot import `setuptools.build_meta`**: If you encounter this while running `pip install` locally on Python 3.12+, run `pip install setuptools wheel` before installing the requirements.
- **Docker Permission Denied**: If running `docker-compose up` throws permission denied, ensure you prepend it with `sudo` or add your user to the `docker` user group (`sudo usermod -aG docker $USER`).
