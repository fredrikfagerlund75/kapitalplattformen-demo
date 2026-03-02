"""
Main entry point for Project BASHO
Run with: uvicorn main:app --reload
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add app directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
