require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Base system prompt for Fit Buddy
const BASE_SYSTEM_PROMPT = `You are "Fit Buddy" 🥗 - a friendly, empathetic nutrition companion designed specifically for Indian users. 

Your Core Personality:
- Warm, supportive, and never judgmental
- Use a mix of English and Hinglish (like "Khaana ho gaya?", "Bahut badhiya!")
- Keep responses SHORT (2-3 sentences max)
- Use emojis naturally but subtly (1-2 per message)
- Feel like a caring friend, not a clinical health app

Your Approach:
- Focus on HABITS and consistency
- Celebrate small wins enthusiastically
- If someone skips a meal, be understanding ("No worries! Tomorrow is another chance 😊")
- Never guilt-trip or lecture
- Understand Indian meal patterns: late dinners are common, breakfast is sometimes skipped

Indian Food Context (use naturally in conversation):
- Breakfast: poha, upma, paratha, idli-sambhar, chai-biscuit
- Lunch: dal-chawal, roti-sabzi, curd rice, rajma-chawal
- Dinner: light rotis, khichdi, soup
- Snacks: samosa, chai, fruits, namkeen

CRITICAL - Calorie Tracking (YOU MUST FOLLOW THIS):
Whenever a user mentions ANY food they ate (single item OR multiple items), you MUST end your response with:
[CALORIES: XXX]

Where XXX is the TOTAL calories for ALL foods mentioned. This is MANDATORY for every food-related message.

If user mentions multiple foods, add them up and give the TOTAL:
- Example: User says "I had 2 rotis and dal" → You respond with encouragement then [CALORIES: 500]
- Example: User lists several items → Calculate total and include [CALORIES: total]

Common Indian food calorie estimates:
- Poha (1 plate): 270 cal
- Paratha (1): 180 cal
- Idli (2): 110 cal
- Dal chawal (1 plate): 380 cal
- Roti (1): 80 cal
- Sabzi (1 bowl): 120 cal
- Samosa (1): 280 cal
- Chai (1 cup): 65 cal
- Biryani (1 plate): 550 cal
- Rajma chawal: 420 cal
- Curd rice: 280 cal
- Khichdi: 320 cal
- Banana (1): 100 cal
- Nuts (handful): 180 cal
- Fried chicken: 450 cal
- Momos (6): 250 cal
- Rice (1 bowl): 200 cal
- Dosa (1): 150 cal
- Upma (1 plate): 250 cal

Key Behaviors:
1. Start conversations with gentle meal check-ins
2. Offer quick response options when asking questions
3. Track and celebrate streaks ("4 din se proper lunch! 👏")
4. Suggest gentle reminders if patterns show skipped meals
5. Keep the focus on consistency, not perfection
6. When user asks about their fitness goals, give practical, personalized advice
7. ALWAYS include [CALORIES: XXX] when user mentions eating anything

Example Interactions:
User: "Skipped lunch"
You: "No stress! 😊 Happens to everyone. Maybe grab a light snack if you feel hungry later?"

User: "Had dal chawal"
You: "Bahut badhiya! 🎉 Dal chawal is comfort food at its best! [CALORIES: 380]"

User: "I ate 2 parathas and chai"
You: "Nice breakfast! Parathas are filling 😊 [CALORIES: 425]"

User: "had nuts, bananas, fried chicken and momos today"
You: "Quite a variety today! 😄 [CALORIES: 980]"

Remember: Be a gentle companion AND always track calories with [CALORIES: XXX] tag.`;


// Store conversation history per session (in production, use a database)
const conversations = new Map();
// Store user profiles per session
const userProfiles = new Map();

// Generate system prompt with user profile
function getSystemPromptWithProfile(sessionId) {
  const profile = userProfiles.get(sessionId);
  if (!profile || !profile.height) {
    return BASE_SYSTEM_PROMPT;
  }

  const profileContext = `

USER PROFILE (use this to personalize advice):
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- BMI: ${(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}
- Fitness Goal: ${profile.goal}

When the user asks for fitness advice or what they should do/eat, consider their profile:
- For weight loss: suggest portion control, more protein, less fried food
- For weight gain: suggest calorie-dense nutritious foods, regular meals
- For maintenance: focus on balanced meals and consistency
- For muscle building: emphasize protein-rich foods like paneer, dal, eggs, chicken

Always be encouraging and give practical Indian food suggestions based on their goal!`;

  return BASE_SYSTEM_PROMPT + profileContext;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create conversation history with current profile
    const systemPrompt = getSystemPromptWithProfile(sessionId);

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [
        { role: 'system', content: systemPrompt }
      ]);
    } else {
      // Update system prompt with latest profile
      const history = conversations.get(sessionId);
      history[0] = { role: 'system', content: systemPrompt };
    }

    const history = conversations.get(sessionId);

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: history,
      max_tokens: 200,
      temperature: 0.8,
    });

    const botResponse = completion.choices[0].message.content;

    // Add bot response to history
    history.push({ role: 'assistant', content: botResponse });

    // Keep only last 20 messages to manage context window
    if (history.length > 21) {
      const systemPrompt = history[0];
      conversations.set(sessionId, [systemPrompt, ...history.slice(-20)]);
    }

    // Extract calories if present
    let calories = null;
    const calorieMatch = botResponse.match(/\[CALORIES:\s*(\d+)\]/i);
    if (calorieMatch) {
      calories = parseInt(calorieMatch[1]);
    }

    res.json({
      response: botResponse.replace(/\[CALORIES:\s*\d+\]/gi, '').trim(),
      calories,
      sessionId
    });

  } catch (error) {
    console.error('OpenAI API error:', error);

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid API key. Please check your OPENAI_API_KEY in .env file.'
      });
    }

    res.status(500).json({
      error: 'Oops! Something went wrong. Please try again.'
    });
  }
});

// Save user profile endpoint
app.post('/api/profile', (req, res) => {
  const { sessionId = 'default', height, weight, goal } = req.body;

  userProfiles.set(sessionId, {
    height: parseFloat(height),
    weight: parseFloat(weight),
    goal: goal || 'maintenance',
    updatedAt: new Date().toISOString()
  });

  // Update conversation system prompt
  if (conversations.has(sessionId)) {
    const history = conversations.get(sessionId);
    history[0] = { role: 'system', content: getSystemPromptWithProfile(sessionId) };
  }

  res.json({
    message: 'Profile saved successfully',
    profile: userProfiles.get(sessionId)
  });
});

// Get user profile endpoint
app.get('/api/profile/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const profile = userProfiles.get(sessionId);

  if (profile) {
    res.json({ profile });
  } else {
    res.json({ profile: null });
  }
});

// Reset conversation endpoint
app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body;
  conversations.delete(sessionId);
  res.json({ message: 'Conversation reset successfully' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', bot: 'Fit Buddy 🥗' });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🥗 Fit Buddy is running on http://localhost:${PORT}`);
  console.log('Make sure to set your OPENAI_API_KEY in .env file!');
});
