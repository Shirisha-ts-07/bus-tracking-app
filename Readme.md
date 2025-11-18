# Bus Tracking App Setup

## Backend Setup (Flask - Bus Tracking)

cd /Users/shirishats/bus-tracking-app-1/bus-tracking-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
PORT=5002 python app.py

## Auth Server Setup (FastAPI - Authentication)

cd /Users/shirishats/bus-tracking-app-1
source bus-tracking-backend/.venv/bin/activate  # Use same venv or create new one
pip install -r bus-tracking-backend/requirements.txt  # Installs all dependencies including email-validator

# Start Auth Server (port 8000)
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# OR use the startup script:
./start_auth_server.sh

## Frontend Setup

cd /Users/shirishats/bus-tracking-app-1/bus-tracking-frontend
npm install
npm run dev