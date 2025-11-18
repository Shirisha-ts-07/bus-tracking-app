import os
from pymongo import MongoClient

# MongoDB connection configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "bus_tracking")

# Create MongoDB client and connect to database
client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

# User collection for authentication
user_collection = db["users"]

# Create unique index on email to prevent duplicate registrations
# This ensures that no two users can register with the same email address
user_collection.create_index("email", unique=True)

# Bus collection for bus data (used by import_buses.py)
bus_collection = db["buses"]

