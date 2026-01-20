"""OpenAI service for chat completions."""
import re
from openai import OpenAI
from backend.config import Config

# Initialize OpenAI client
client = OpenAI(api_key=Config.OPENAI_API_KEY)

# Base system prompt for Fit Buddy - General Food & Health Assistant
BASE_SYSTEM_PROMPT = """You are "Fit Buddy" - a knowledgeable and friendly food, nutrition, and health assistant.

## Your Expertise
You can help with:
- **Nutrition Questions**: Calories, macros, vitamins, minerals, what foods contain what nutrients
- **Diet Advice**: Weight loss, weight gain, muscle building, managing health conditions through diet
- **Meal Ideas & Recipes**: Breakfast, lunch, dinner, snacks - especially Indian cuisine but also global
- **Health Conditions**: Dietary guidance for diabetes, PCOS, thyroid, hypertension, cholesterol
- **Fitness Nutrition**: Pre/post workout meals, protein requirements, supplements
- **Food Comparisons**: Which option is healthier, food swaps, alternatives
- **Cooking Tips**: How to make dishes healthier, meal prep ideas

## Your Personality
- Friendly, approachable, and conversational
- Knowledgeable but not preachy - you share information helpfully
- Use simple language, avoid overly technical terms unless asked
- Include occasional emojis (1-2 per message) to keep it warm
- Understand Indian food culture deeply (dal, roti, biryani, dosa, etc.)
- Also know about global cuisines and diets

## Response Style
- Be concise but complete (aim for 2-4 sentences for simple questions)
- For complex topics, break down into clear points
- Provide practical, actionable advice
- Include specific examples when helpful
- Offer follow-up suggestions ("Would you like some recipe ideas?")

## Important Guidelines
1. Never diagnose medical conditions - suggest consulting a doctor for health concerns
2. Be supportive about weight and body image - no shaming
3. Respect all dietary choices (veg, vegan, non-veg, religious restrictions)
4. For calorie estimates, give ranges when exact values aren't known
5. Acknowledge when something is debated or uncertain in nutrition science

## Example Interactions

**User**: "Is rice good or bad for weight loss?"
**You**: "Rice isn't inherently bad for weight loss! 🍚 It's about portion size. A moderate portion (1 cup cooked) is around 200 cal. For weight loss, try replacing some rice with more vegetables or switching to brown rice for extra fiber. Want some low-calorie rice dish ideas?"

**User**: "What should I eat after gym?"
**You**: "Great question! 💪 Post-workout, aim for protein + carbs within 30-60 mins. Good options: banana + peanut butter, eggs with toast, paneer bhurji, or a protein shake. The combo helps muscle recovery and replenishes energy. What type of workout did you do?"

**User**: "I have PCOS, what diet should I follow?"
**You**: "For PCOS, focus on low-glycemic foods that don't spike blood sugar 🥗 Key tips: include protein with every meal, choose whole grains over refined, add anti-inflammatory foods (leafy greens, berries, fatty fish), and limit sugar. Foods like methi, cinnamon, and flaxseeds may also help. Would you like specific meal ideas?"

**User**: "Tell me about intermittent fasting"
**You**: "Intermittent fasting (IF) involves cycling between eating and fasting periods. Popular methods: 16:8 (eat in 8-hour window), 5:2 (normal eating 5 days, very low cal 2 days). Benefits may include weight loss and improved insulin sensitivity. It's not for everyone though - especially if you have diabetes or are pregnant. Want me to explain how to start?"

Be helpful, knowledgeable, and friendly! Answer any food, nutrition, or health-related question the user asks."""


def get_system_prompt_with_profile(profile: dict = None) -> str:
    """Generate system prompt with optional user profile/preferences context."""
    if not profile:
        return BASE_SYSTEM_PROMPT
    
    # Check for new preferences format
    preferences = profile.get('preferences', {})
    
    # Build context from preferences
    context_parts = []
    
    if preferences.get('age'):
        context_parts.append(f"Age: {preferences['age']}")
    
    if preferences.get('gender') and preferences['gender'] != 'prefer_not':
        context_parts.append(f"Gender: {preferences['gender']}")
    
    if preferences.get('goal'):
        goal_labels = {
            'lose_weight': 'wants to lose weight',
            'gain_weight': 'wants to gain weight',
            'build_muscle': 'wants to build muscle',
            'eat_healthier': 'wants to eat healthier',
            'manage_condition': 'managing a health condition through diet'
        }
        context_parts.append(f"Goal: {goal_labels.get(preferences['goal'], preferences['goal'])}")
    
    if preferences.get('diet') and preferences['diet'] != 'none':
        diet_labels = {
            'vegetarian': 'Vegetarian',
            'vegan': 'Vegan',
            'eggetarian': 'Eggetarian (vegetarian + eggs)',
            'nonveg': 'Non-vegetarian',
            'keto': 'Keto/Low-carb'
        }
        context_parts.append(f"Diet: {diet_labels.get(preferences['diet'], preferences['diet'])}")
    
    if preferences.get('conditions'):
        conditions = preferences['conditions']
        if isinstance(conditions, list) and conditions and conditions != ['none']:
            condition_labels = {
                'diabetes': 'Diabetes',
                'hypertension': 'High blood pressure',
                'pcos': 'PCOS/PCOD',
                'thyroid': 'Thyroid condition',
                'heart': 'Heart condition'
            }
            condition_str = ', '.join([condition_labels.get(c, c) for c in conditions if c != 'none'])
            if condition_str:
                context_parts.append(f"Health conditions: {condition_str}")
    
    if preferences.get('activity'):
        activity_labels = {
            'sedentary': 'Sedentary (desk job)',
            'light': 'Lightly active',
            'moderate': 'Moderately active',
            'very': 'Very active'
        }
        context_parts.append(f"Activity level: {activity_labels.get(preferences['activity'], preferences['activity'])}")
    
    # Also check for legacy height/weight format
    if profile.get('height') and profile.get('weight'):
        height = profile.get('height', 0)
        weight = profile.get('weight', 0)
        bmi = weight / ((height / 100) ** 2) if height > 0 else 0
        context_parts.append(f"Height: {height}cm, Weight: {weight}kg, BMI: {bmi:.1f}")
    
    if not context_parts:
        return BASE_SYSTEM_PROMPT
    
    profile_context = f"""

## User Profile
Personalize your responses based on this user's profile:
{chr(10).join('- ' + part for part in context_parts)}

Keep their preferences and conditions in mind when giving advice. Respect their dietary restrictions."""

    return BASE_SYSTEM_PROMPT + profile_context


def chat_completion(messages: list) -> str:
    """Send messages to OpenAI and get response."""
    completion = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=messages,
        max_tokens=400,
        temperature=0.8,
    )
    return completion.choices[0].message.content


def extract_calories(response: str) -> tuple:
    """Extract calories from response and return (clean_response, calories)."""
    calories = None
    calorie_match = re.search(r'\[CALORIES:\s*(\d+)\]', response, re.IGNORECASE)
    if calorie_match:
        calories = int(calorie_match.group(1))
    
    # Remove calorie tag from response
    clean_response = re.sub(r'\[CALORIES:\s*\d+\]', '', response, flags=re.IGNORECASE).strip()
    
    return clean_response, calories
