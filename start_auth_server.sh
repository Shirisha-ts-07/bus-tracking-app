#!/bin/bash

# Start FastAPI Auth Server
# This script starts the FastAPI authentication server on port 8000

cd "$(dirname "$0")"

# Check if virtual environment exists in bus-tracking-backend
if [ -d "bus-tracking-backend/.venv" ]; then
    echo "Activating virtual environment from bus-tracking-backend..."
    source bus-tracking-backend/.venv/bin/activate
elif [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
else
    echo "⚠️  No virtual environment found. Creating one..."
    python3 -m venv .venv
    source .venv/bin/activate
    echo "Installing dependencies..."
    pip install -r bus-tracking-backend/requirements.txt
fi

# Check if dependencies are installed
python3 -c "import fastapi, uvicorn, pymongo, email_validator" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing dependencies..."
    pip install fastapi uvicorn pymongo python-jose[cryptography] passlib[bcrypt] pydantic[email] email-validator
fi

echo "Starting FastAPI Auth Server on http://127.0.0.1:8000"
echo "Press CTRL+C to stop"
echo ""

# Start the server
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

