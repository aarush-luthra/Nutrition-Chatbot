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
    
    # Serve frontend files
    frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
    
    @app.route('/')
    def serve_index():
        return send_from_directory(frontend_path, 'index.html')
    
    @app.route('/css/<path:filename>')
    def serve_css(filename):
        return send_from_directory(os.path.join(frontend_path, 'css'), filename)
    
    @app.route('/js/<path:filename>')
    def serve_js(filename):
        return send_from_directory(os.path.join(frontend_path, 'js'), filename)
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
