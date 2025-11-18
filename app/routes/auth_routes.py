from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from ..models import (
    Token,
    UserCreate,
    UserLogin,
    UserPublic,
    create_user_document,
    user_collection,
    user_doc_to_public,
)


router = APIRouter()


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate):
    try:
        # Check if email already exists (application-level check)
        existing = user_collection.find_one({"email": payload.email.lower()})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user document
        user_doc = create_user_document(payload)
        user_doc["password"] = get_password_hash(payload.password)
        
        # Insert user (database-level unique index will also prevent duplicates)
        try:
            user_collection.insert_one(user_doc)
        except Exception as e:
            # Handle MongoDB duplicate key error as a fallback (race condition protection)
            error_str = str(e).lower()
            if "duplicate key" in error_str or "e11000" in error_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            # Handle MongoDB connection errors
            elif "connection" in error_str or "timeout" in error_str:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection error. Please try again later."
                )
            # Log unexpected errors for debugging
            print(f"Unexpected error during user registration: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user account: {str(e)}"
            )
        
        return user_doc_to_public(user_doc)
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any other unexpected errors
        print(f"Unexpected error in register_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration"
        )


@router.post("/login", response_model=Token)
def login_user(payload: UserLogin):
    user_doc = user_collection.find_one({"email": payload.email.lower()})
    if not user_doc or not verify_password(payload.password, user_doc["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token({"sub": user_doc["id"]}, expires_delta=timedelta(minutes=60))
    return Token(access_token=access_token)


@router.get("/profile", response_model=UserPublic)
def read_profile(current_user: UserPublic = Depends(get_current_user)):
    return current_user


