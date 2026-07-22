import sys
import os

# Add backend directory to path so imports work correctly inside Vercel Serverless Functions
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app
