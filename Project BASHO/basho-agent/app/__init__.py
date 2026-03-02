"""
Project BASHO - B2B SaaS Outreach Agent
MVP for discovering and ranking decision-makers with personalized outreach drafts
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from app.api import routes
from app.database import init_db

app = FastAPI(
    title="Project BASHO",
    description="B2B SaaS Outreach Agent - Discover and rank decision-makers with personalized messages",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(routes.router, prefix="/api", tags=["outreach"])

# Serve index.html
@app.get("/")
@app.get("/index.html")
async def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "..", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    return {"error": "index.html not found"}

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "basho-agent"}

