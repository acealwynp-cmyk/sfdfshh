"""
FastAPI backend for Phaser game with leaderboard support.
Optimized for high traffic and concurrent users.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict
from datetime import datetime, timedelta
import os
import asyncio
from collections import defaultdict
import time

app = FastAPI(title="Degen Force Game API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection with connection pooling
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=50,  # Connection pool for high concurrency
    minPoolSize=10,
    maxIdleTimeMS=30000,
    serverSelectionTimeoutMS=5000
)
db = client["degen_force"]
leaderboard_collection = db["leaderboard"]

# Rate limiting storage (in-memory for simplicity, use Redis in production)
rate_limit_store: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 10  # max score submissions per minute per wallet

# Cache for leaderboard (reduces DB load)
leaderboard_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 30  # Cache for 30 seconds
}

# Pydantic models
class LeaderboardEntry(BaseModel):
    wallet_address: str
    score: int
    survival_time_seconds: int
    enemies_killed: int
    biome_reached: str
    difficulty: str
    timestamp: Optional[datetime] = None

class LeaderboardResponse(BaseModel):
    wallet_address: str
    score: int
    survival_time: str
    enemies_killed: int
    biome_reached: str
    difficulty: str
    timestamp: str
    rank: int

@app.get("/")
async def root():
    """Root endpoint"""
    return {"status": "ok", "message": "Degen Force Backend"}

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "degen-force-backend"}

@app.get("/api/")
async def api_root():
    """API root endpoint"""
    return {"status": "ok", "message": "Degen Force API", "version": "1.0.0"}

@app.get("/api/health")
async def api_health():
    """API health check endpoint"""
    return {"status": "healthy", "service": "degen-force-api"}

@app.post("/api/leaderboard/submit")
async def submit_score(entry: LeaderboardEntry):
    """Submit a score to the leaderboard - requires wallet address"""
    try:
        # Validate wallet address is provided
        if not entry.wallet_address or len(entry.wallet_address) < 10:
            raise HTTPException(status_code=400, detail="Valid wallet address is required")
        
        # Add timestamp
        entry_dict = entry.model_dump()
        entry_dict["timestamp"] = datetime.utcnow()
        
        # Insert into database
        result = await leaderboard_collection.insert_one(entry_dict)
        
        return {
            "status": "success",
            "message": "Score submitted successfully",
            "id": str(result.inserted_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit score: {str(e)}")

@app.get("/api/leaderboard")
async def get_leaderboard(limit: int = 100, difficulty: Optional[str] = None):
    """Get top scores from the leaderboard"""
    try:
        # Build query
        query = {}
        if difficulty:
            query["difficulty"] = difficulty.lower()
        
        # Get top scores sorted by score descending
        cursor = leaderboard_collection.find(query, {"_id": 0}).sort("score", -1).limit(limit)
        entries = await cursor.to_list(length=limit)
        
        # Format response with ranks
        leaderboard = []
        for idx, entry in enumerate(entries):
            # Format survival time
            seconds = entry.get("survival_time_seconds", 0)
            minutes = seconds // 60
            secs = seconds % 60
            survival_time = f"{minutes:02d}:{secs:02d}"
            
            leaderboard.append({
                "rank": idx + 1,
                "wallet_address": entry["wallet_address"],
                "score": entry["score"],
                "survival_time": survival_time,
                "enemies_killed": entry.get("enemies_killed", 0),
                "biome_reached": entry["biome_reached"],
                "difficulty": entry["difficulty"],
                "timestamp": entry["timestamp"].isoformat() if "timestamp" in entry else ""
            })
        
        return {
            "status": "success",
            "total": len(leaderboard),
            "leaderboard": leaderboard
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leaderboard: {str(e)}")
