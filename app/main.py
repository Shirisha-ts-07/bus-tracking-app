from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.auth_routes import router as auth_router

app = FastAPI(title="Auth Service")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/")
def root():
    return {"status": "ok"}


