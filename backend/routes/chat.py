"""Chat API routes."""
from flask import Blueprint, request, jsonify
from backend.services.openai_service import (
    get_system_prompt_with_profile,
    chat_completion,
    extract_calories
)

chat_bp = Blueprint('chat', __name__)

# Store conversation history per session (in production, use a database)
conversations = {}
# Store user profiles per session
user_profiles = {}


@chat_bp.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages."""
    try:
        data = request.get_json()
        message = data.get('message')
        session_id = data.get('sessionId', 'default')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get or create conversation history with current profile
        profile = user_profiles.get(session_id)
        system_prompt = get_system_prompt_with_profile(profile)
        
        if session_id not in conversations:
            conversations[session_id] = [
                {'role': 'system', 'content': system_prompt}
            ]
        else:
            # Update system prompt with latest profile
            conversations[session_id][0] = {'role': 'system', 'content': system_prompt}
        
        history = conversations[session_id]
        
        # Add user message to history
        history.append({'role': 'user', 'content': message})
        
        # Call OpenAI API
        bot_response = chat_completion(history)
        
        # Add bot response to history
        history.append({'role': 'assistant', 'content': bot_response})
        
        # Keep only last 20 messages to manage context window
        if len(history) > 21:
            system_msg = history[0]
            conversations[session_id] = [system_msg] + history[-20:]
        
        # Extract calories if present
        clean_response, calories = extract_calories(bot_response)
        
        return jsonify({
            'response': clean_response,
            'calories': calories,
            'sessionId': session_id
        })
        
    except Exception as e:
        print(f'OpenAI API error: {e}')
        
        if 'invalid_api_key' in str(e).lower():
            return jsonify({
                'error': 'Invalid API key. Please check your OPENAI_API_KEY in .env file.'
            }), 401
        
        return jsonify({
            'error': 'Oops! Something went wrong. Please try again.'
        }), 500


@chat_bp.route('/api/reset', methods=['POST'])
def reset():
    """Reset conversation history."""
    data = request.get_json()
    session_id = data.get('sessionId', 'default')
    
    if session_id in conversations:
        del conversations[session_id]
    
    return jsonify({'message': 'Conversation reset successfully'})


@chat_bp.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'bot': 'Fit Buddy 🥗'})


# Export user_profiles for use by profile routes
def get_user_profiles():
    return user_profiles
