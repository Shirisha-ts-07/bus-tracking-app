import os
import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr, Field
from pymongo import MongoClient


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "bus_tracking")

# Create MongoDB client with connection timeout
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[MONGO_DB_NAME]
user_collection = db.get_collection("users")

# Create unique index on email (with error handling)
try:
    user_collection.create_index("email", unique=True)
except Exception as e:
    print(f"Warning: Could not create email index (may already exist): {e}")

# Test MongoDB connection on import
try:
    client.admin.command('ping')
    print(f"✅ MongoDB connected successfully to {MONGO_URI}")
except Exception as e:
    print(f"⚠️ Warning: MongoDB connection failed: {e}")
    print(f"   Make sure MongoDB is running and accessible at {MONGO_URI}")


class UserBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserInDB(UserBase):
    id: str
    password: str

    class Config:
        from_attributes = True


class UserPublic(UserBase):
    id: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


def create_user_document(user: UserCreate) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "name": user.name,
        "email": user.email.lower(),
        "phone": user.phone,
        "password": "",  # to be set after hashing
    }


def user_doc_to_public(user_doc: dict) -> UserPublic:
    return UserPublic(
        id=user_doc["id"],
        name=user_doc["name"],
        email=user_doc["email"],
        phone=user_doc.get("phone"),
    )


