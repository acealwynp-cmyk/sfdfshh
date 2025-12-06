"""
Minimal FastAPI backend for Phaser game deployment.
This is a frontend-only game - backend only provides health checks.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Infinite Battle Game API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"status": "ok", "message": "Infinite Battle Game Backend"}

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "infinite-battle-backend"}

@app.get("/api/")
async def api_root():
    """API root endpoint"""
    return {"status": "ok", "message": "Infinite Battle Game API", "version": "1.0.0"}

@app.get("/api/health")
async def api_health():
    """API health check endpoint"""
    return {"status": "healthy", "service": "infinite-battle-api"}
