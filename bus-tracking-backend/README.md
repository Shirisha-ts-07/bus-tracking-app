# Bus Tracking Backend

## Setup

1. Create and activate a virtual environment
   - macOS/Linux (zsh):
     ```bash
     python3 -m venv .venv && source .venv/bin/activate
     ```

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment (optional, defaults are provided)
   Create a `.env` file (same directory) and set values as needed:
   ```bash
   # Example .env
   DEBUG=true
   SECRET_KEY=dev-secret-key
   DATABASE_URL=sqlite:///app.db
   JWT_SECRET=change-me
   CORS_ORIGINS=*
   PORT=5001
   ```

4. Initialize database (first time)
   ```bash
   alembic upgrade head
   ```

5. Run the server
   ```bash
   python app.py
   ```

## Migrations (Alembic)

- Create a new migration from models:
  ```bash
  alembic revision --autogenerate -m "describe change"
  alembic upgrade head
  ```

### Endpoints

- `GET /healthz` → health check
- `GET /version` → backend version

### Notes

- Existing prototype endpoints live in `sqlcode.py` (direct MySQL). The new app factory in `app.py` will become the main entrypoint as we add SQLAlchemy models and blueprints.


