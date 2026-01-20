"""Profile API routes."""
from flask import Blueprint, request, jsonify
from backend.routes.chat import get_user_profiles, conversations
from backend.services.openai_service import get_system_prompt_with_profile

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('/api/profile', methods=['POST'])
def save_profile():
    """Save user profile."""
    data = request.get_json()
    session_id = data.get('sessionId', 'default')
    height = data.get('height')
    weight = data.get('weight')
    goal = data.get('goal', 'maintenance')
    
    user_profiles = get_user_profiles()
    
    user_profiles[session_id] = {
        'height': float(height) if height else None,
        'weight': float(weight) if weight else None,
        'goal': goal
    }
    
    # Update conversation system prompt
    if session_id in conversations:
        profile = user_profiles[session_id]
        conversations[session_id][0] = {
            'role': 'system',
            'content': get_system_prompt_with_profile(profile)
        }
    
    return jsonify({
        'message': 'Profile saved successfully',
        'profile': user_profiles[session_id]
    })


@profile_bp.route('/api/profile/<session_id>', methods=['GET'])
def get_profile(session_id):
    """Get user profile."""
    user_profiles = get_user_profiles()
    profile = user_profiles.get(session_id)
    
    if profile:
        return jsonify({'profile': profile})
    else:
        return jsonify({'profile': None})
