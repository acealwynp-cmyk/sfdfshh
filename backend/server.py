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
DB_NAME = os.environ.get("DB_NAME", "degen_force")
client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=50,  # Connection pool for high concurrency
    minPoolSize=10,
    maxIdleTimeMS=30000,
    serverSelectionTimeoutMS=5000
)
db = client[DB_NAME]
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

# Pydantic models with validation
class LeaderboardEntry(BaseModel):
    wallet_address: str = Field(..., min_length=10, max_length=100)
    score: int = Field(..., ge=0, le=10000000)  # Max 10M score
    survival_time_seconds: int = Field(..., ge=0, le=86400)  # Max 24 hours
    enemies_killed: int = Field(..., ge=0, le=100000)  # Max 100k enemies
    biome_reached: str = Field(..., max_length=50)
    difficulty: str = Field(..., pattern="^(easy|hard|cursed)$")
    timestamp: Optional[datetime] = None
    
    @validator('wallet_address')
    def validate_wallet(cls, v):
        # Basic validation for wallet address
        if not v or len(v.strip()) < 10:
            raise ValueError('Invalid wallet address')
        return v.strip()
    
    @validator('score', 'survival_time_seconds', 'enemies_killed')
    def validate_positive(cls, v):
        if v < 0:
            raise ValueError('Value must be non-negative')
        return v

class LeaderboardResponse(BaseModel):
    wallet_address: str
    score: int
    survival_time: str
    enemies_killed: int
    biome_reached: str
    difficulty: str
    timestamp: str
    rank: int

# Rate limiting function
async def check_rate_limit(wallet_address: str) -> bool:
    """Check if wallet has exceeded rate limit"""
    now = time.time()
    # Clean old entries
    rate_limit_store[wallet_address] = [
        ts for ts in rate_limit_store[wallet_address] 
        if now - ts < RATE_LIMIT_WINDOW
    ]
    
    # Check limit
    if len(rate_limit_store[wallet_address]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    
    # Add new request
    rate_limit_store[wallet_address].append(now)
    return True

# Cache management
def get_cached_leaderboard(difficulty: Optional[str] = None):
    """Get leaderboard from cache if valid"""
    cache_key = f"leaderboard_{difficulty or 'all'}"
    now = time.time()
    
    if cache_key in leaderboard_cache:
        cache_data = leaderboard_cache[cache_key]
        if now - cache_data["timestamp"] < cache_data["ttl"]:
            return cache_data["data"]
    
    return None

def set_cached_leaderboard(data, difficulty: Optional[str] = None):
    """Cache leaderboard data"""
    cache_key = f"leaderboard_{difficulty or 'all'}"
    leaderboard_cache[cache_key] = {
        "data": data,
        "timestamp": time.time(),
        "ttl": 30  # 30 seconds cache
    }

def invalidate_leaderboard_cache():
    """Clear all leaderboard caches after new score submission"""
    leaderboard_cache.clear()

@app.on_event("startup")
async def startup_event():
    """Initialize database indexes for optimal performance"""
    try:
        # Create indexes for fast queries and concurrent operations
        await leaderboard_collection.create_index([("score", -1)])  # Descending score for ranking
        await leaderboard_collection.create_index([("wallet_address", 1)], unique=True)  # Unique wallet with fast lookup
        await leaderboard_collection.create_index([("last_difficulty", 1)])  # Filter by difficulty
        await leaderboard_collection.create_index([("last_played", -1)])  # Recent activity
        await leaderboard_collection.create_index([("score", -1), ("last_played", -1)])  # Compound index for leaderboard
        await leaderboard_collection.create_index([("total_games", -1)])  # Most active players
        
        print("✓ Database indexes created successfully (with unique wallet constraint)")
    except Exception as e:
        print(f"⚠ Warning: Failed to create indexes: {e}")

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

@app.get("/api/stats")
async def get_stats():
    """Get system statistics for monitoring"""
    try:
        total_scores = await leaderboard_collection.count_documents({})
        unique_players = len(await leaderboard_collection.distinct("wallet_address"))
        
        # Get top score
        top_score_doc = await leaderboard_collection.find_one(
            {},
            {"score": 1, "_id": 0},
            sort=[("score", -1)]
        )
        top_score = top_score_doc["score"] if top_score_doc else 0
        
        return {
            "status": "success",
            "stats": {
                "total_scores": total_scores,
                "unique_players": unique_players,
                "top_score": top_score,
                "cache_size": len(leaderboard_cache)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.post("/api/leaderboard/submit")
async def submit_score(entry: LeaderboardEntry, request: Request):
    """Submit a score to the leaderboard - requires wallet address
    Rate limited to prevent spam and abuse
    Accumulates scores for the same wallet address"""
    try:
        # Rate limiting check
        if not await check_rate_limit(entry.wallet_address):
            raise HTTPException(
                status_code=429, 
                detail=f"Rate limit exceeded. Max {RATE_LIMIT_MAX_REQUESTS} submissions per {RATE_LIMIT_WINDOW} seconds"
            )
        
        # Validate wallet address is provided
        if not entry.wallet_address or len(entry.wallet_address) < 10:
            raise HTTPException(status_code=400, detail="Valid wallet address is required")
        
        current_time = datetime.utcnow()
        ip_address = request.client.host if request.client else "unknown"
        
        # Use atomic upsert to handle concurrent submissions
        # This prevents race conditions when multiple games finish simultaneously
        result = await leaderboard_collection.update_one(
            {"wallet_address": entry.wallet_address},
            {
                "$inc": {
                    "score": entry.score,  # Atomically increment score
                    "total_games": 1  # Atomically increment game count
                },
                "$set": {
                    "last_survival_time_seconds": entry.survival_time_seconds,
                    "last_enemies_killed": entry.enemies_killed,
                    "last_biome_reached": entry.biome_reached,
                    "last_difficulty": entry.difficulty,
                    "last_played": current_time,
                    "ip_address": ip_address
                },
                "$max": {
                    "best_survival_time_seconds": entry.survival_time_seconds,
                    "best_enemies_killed": entry.enemies_killed
                },
                "$setOnInsert": {
                    "timestamp": current_time,  # Only set on first insert
                    "wallet_address": entry.wallet_address
                }
            },
            upsert=True  # Create document if it doesn't exist
        )
        
        # Check if this was an insert or update
        if result.upserted_id:
            message = "New player score created"
            print(f"✓ New player: {entry.wallet_address[:8]}... - {entry.score} pts")
        else:
            # Fetch updated score for logging
            updated = await leaderboard_collection.find_one(
                {"wallet_address": entry.wallet_address},
                {"score": 1, "total_games": 1}
            )
            total_score = updated.get("score", entry.score)
            total_games = updated.get("total_games", 1)
            message = f"Score updated (accumulated): {total_score} pts"
            print(f"✓ {entry.wallet_address[:8]}... - Added {entry.score} pts → Total: {total_score} pts ({total_games} games)")
        
        # Invalidate cache for fresh leaderboard
        invalidate_leaderboard_cache()
        
        return {
            "status": "success",
            "message": message
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"✗ Error submitting score: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit score")

@app.get("/api/leaderboard")
async def get_leaderboard(limit: int = 100, difficulty: Optional[str] = None):
    """Get top scores from the leaderboard
    Cached for 30 seconds to handle high traffic"""
    try:
        # Validate limit
        if limit < 1 or limit > 1000:
            limit = 100
        
        # Check cache first
        cached_data = get_cached_leaderboard(difficulty)
        if cached_data:
            # Return cached data (limit applied)
            return {
                "status": "success",
                "total": len(cached_data[:limit]),
                "leaderboard": cached_data[:limit],
                "cached": True
            }
        
        # Build query
        query = {}
        if difficulty:
            query["difficulty"] = difficulty.lower()
        
        # Get top scores sorted by score descending
        # Using projection to reduce data transfer
        projection = {
            "_id": 0,
            "wallet_address": 1,
            "score": 1,
            "total_games": 1,
            "best_survival_time_seconds": 1,
            "best_enemies_killed": 1,
            "last_biome_reached": 1,
            "last_difficulty": 1,
            "last_played": 1,
            "timestamp": 1
        }
        
        cursor = leaderboard_collection.find(query, projection).sort("score", -1).limit(limit)
        entries = await cursor.to_list(length=limit)
        
        # Format response with ranks
        leaderboard = []
        for idx, entry in enumerate(entries):
            # Format survival time (use best time)
            seconds = entry.get("best_survival_time_seconds", 0)
            minutes = seconds // 60
            secs = seconds % 60
            survival_time = f"{minutes:02d}:{secs:02d}"
            
            leaderboard.append({
                "rank": idx + 1,
                "wallet_address": entry["wallet_address"],
                "score": entry["score"],
                "total_games": entry.get("total_games", 1),
                "survival_time": survival_time,
                "enemies_killed": entry.get("best_enemies_killed", 0),
                "biome_reached": entry.get("last_biome_reached", "Unknown"),
                "difficulty": entry.get("last_difficulty", "easy"),
                "timestamp": entry.get("last_played", entry.get("timestamp")).isoformat() if entry.get("last_played") or entry.get("timestamp") else ""
            })
        
        # Cache the result
        set_cached_leaderboard(leaderboard, difficulty)
        
        return {
            "status": "success",
            "total": len(leaderboard),
            "leaderboard": leaderboard,
            "cached": False
        }
    except Exception as e:
        print(f"✗ Error fetching leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")

@app.delete("/api/leaderboard/reset")
async def reset_leaderboard():
    """Reset leaderboard (for testing/admin use)"""
    try:
        result = await leaderboard_collection.delete_many({})
        invalidate_leaderboard_cache()
        print(f"✓ Leaderboard reset: {result.deleted_count} entries removed")
        return {
            "status": "success",
            "message": f"Deleted {result.deleted_count} entries",
            "deleted_count": result.deleted_count
        }
    except Exception as e:
        print(f"✗ Error resetting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset leaderboard")

