#!/usr/bin/env python3
"""Run script for Fit Buddy Flask backend."""
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.config import Config

if __name__ == '__main__':
    app = create_app()
    print(f'🥗 Fit Buddy is running on http://localhost:{Config.PORT}')
    print('Make sure to set your OPENAI_API_KEY in .env file!')
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
