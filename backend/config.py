"""Configuration management for the Flask backend."""
import os
from dotenv import load_dotenv

# Load environment variables from .env file (in parent directory)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Config:
    """Application configuration."""
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
