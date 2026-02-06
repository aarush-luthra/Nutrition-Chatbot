"""Main Flask application."""
from flask import Flask, send_from_directory
from flask_cors import CORS
import os

from backend.config import Config
from backend.routes.chat import chat_bp
from backend.routes.profile import profile_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Enable CORS for all routes
    CORS(app, origins=['*'])
    
    # Register blueprints
    app.register_blueprint(chat_bp)
    app.register_blueprint(profile_bp)
    
    # Serve frontend files from public folder
    public_path = os.path.join(os.path.dirname(__file__), '..', 'public')
    
    @app.route('/')
    def serve_index():
        return send_from_directory(public_path, 'index.html')

    @app.route('/chat')
    def serve_chat():
        return send_from_directory(public_path, 'chat.html')
    
    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory(public_path, filename)
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
