# Fit Buddy 🥗 - Nutrition Chatbot

A lightweight, behavior-based nutrition chatbot designed for Indian users that supports consistent eating habits with minimal effort. Built with OpenAI GPT-4o-mini.

![Fit Buddy Screenshot](https://via.placeholder.com/800x400?text=Fit+Buddy+Nutrition+Chatbot)

## ✨ Features

### 🍛 Indian Context
- Understands Indian meal patterns (late dinners, chai breaks)
- Familiar foods: poha, dal-chawal, roti-sabzi, biryani, and more
- Hinglish conversation style ("Khaana ho gaya?", "Bahut badhiya!")

### 👤 User Profile
- Track height, weight, and fitness goals
- Automatic BMI calculation
- Personalized diet advice based on your goals

### 🔥 Calorie Tracking
- Daily calorie counter with visual progress bar
- AI estimates calories from food mentions
- Automatic reset at midnight

### 💬 Empathetic Chatbot
- Warm, supportive, never judgmental
- One-tap quick replies for easy interaction
- Celebrates streaks and consistency

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API Key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd nutrition_chat

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your OpenAI API key to .env
# OPENAI_API_KEY=sk-your-key-here

# Start the server
npm start
```

Open http://localhost:3000 in your browser.

## 📁 Project Structure

```
nutrition_chat/
├── server.js           # Express backend with OpenAI integration
├── package.json        # Dependencies
├── .env               # Environment variables (create this)
├── .env.example       # Example environment file
└── public/
    ├── index.html     # Chat interface
    ├── styles.css     # Purple/lavender theme
    └── app.js         # Frontend logic
```

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `PORT` | Server port (default: 3000) |

### Calorie Goal

Default calorie goal is 2000 kcal. Users can customize this in:
- **Menu (⋯) → My Profile → Daily Calorie Goal**

## 💡 Usage

### Setting Up Profile
1. Click menu (⋯) → "My Profile"
2. Enter height (cm) and weight (kg)
3. Select fitness goal
4. Set daily calorie target
5. Save

### Getting Personalized Advice
Ask Fit Buddy:
- "What should I eat for weight loss?"
- "Suggest a healthy dinner"
- "I'm feeling hungry, what should I have?"

### Logging Meals
Just tell Fit Buddy what you ate:
- "Had dal chawal for lunch"
- "I ate 2 parathas and chai"
- "Just had a samosa and chai"

The chatbot will estimate calories and update your daily tracker.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4o-mini
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Storage**: LocalStorage (client), In-memory (server)

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send message, get AI response |
| `/api/profile` | POST | Save user profile |
| `/api/profile/:sessionId` | GET | Get user profile |
| `/api/reset` | POST | Reset conversation |
| `/api/health` | GET | Health check |

## 🎨 Design

- **Theme**: Purple/lavender
- **Style**: Mobile-first, rounded corners, soft shadows
- **Inspiration**: Modern chat interfaces like Drift

## 📄 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Made with ❤️ for healthier eating habits
