/* ========================================
   Fit Buddy - Nutrition Chatbot App Logic
   ======================================== */

// State Management
const state = {
    sessionId: localStorage.getItem('fitbuddy_session') || generateSessionId(),
    isTyping: false,
    mealLog: JSON.parse(localStorage.getItem('fitbuddy_meals') || '[]'),
    streak: parseInt(localStorage.getItem('fitbuddy_streak') || '0'),
    profile: JSON.parse(localStorage.getItem('fitbuddy_profile') || 'null'),
    calorieLog: JSON.parse(localStorage.getItem('fitbuddy_calories') || '{}'),
    calorieGoal: parseInt(localStorage.getItem('fitbuddy_calorie_goal') || '2000'),
};

// Save session ID
localStorage.setItem('fitbuddy_session', state.sessionId);

// DOM Elements
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const quickRepliesContainer = document.getElementById('quickRepliesContainer');
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const resetChatBtn = document.getElementById('resetChat');
const viewProgressBtn = document.getElementById('viewProgress');
const editProfileBtn = document.getElementById('editProfile');
const progressModal = document.getElementById('progressModal');
const profileModal = document.getElementById('profileModal');
const closeModalBtn = document.getElementById('closeModal');
const closeProfileModalBtn = document.getElementById('closeProfileModal');
const streakCount = document.getElementById('streakCount');
const weeklyBars = document.getElementById('weeklyBars');
const progressMessage = document.getElementById('progressMessage');
const calorieHistory = document.getElementById('calorieHistory');

// Calorie tracker elements
const totalCaloriesEl = document.getElementById('totalCalories');
const calorieBarFill = document.getElementById('calorieBarFill');
const calorieGoalText = document.getElementById('calorieGoalText');

// Profile form elements
const profileForm = document.getElementById('profileForm');
const heightInput = document.getElementById('heightInput');
const weightInput = document.getElementById('weightInput');
const goalSelect = document.getElementById('goalSelect');
const calorieGoalInput = document.getElementById('calorieGoalInput');
const bmiDisplay = document.getElementById('bmiDisplay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAndResetDailyCalories();
    initializeChat();
    setupEventListeners();
    updateProgress();
    updateCalorieDisplay();
    loadProfile();
});

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Check if we need to reset daily calories (new day)
function checkAndResetDailyCalories() {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('fitbuddy_last_date');

    if (lastDate !== today) {
        // It's a new day - calories for today should start at 0
        localStorage.setItem('fitbuddy_last_date', today);
    }
}

// Get today's calories
function getTodayCalories() {
    const today = new Date().toDateString();
    return state.calorieLog[today] || 0;
}

// Add calories to today's total
function addCalories(amount) {
    const today = new Date().toDateString();
    state.calorieLog[today] = (state.calorieLog[today] || 0) + amount;
    localStorage.setItem('fitbuddy_calories', JSON.stringify(state.calorieLog));
    updateCalorieDisplay();
}

// Update calorie display
function updateCalorieDisplay() {
    const todayCalories = getTodayCalories();
    totalCaloriesEl.textContent = todayCalories;

    // Update progress bar
    const percentage = Math.min((todayCalories / state.calorieGoal) * 100, 100);
    calorieBarFill.style.width = `${percentage}%`;

    // Update goal text
    calorieGoalText.textContent = `Goal: ${state.calorieGoal}`;

    // Add animation
    totalCaloriesEl.parentElement.classList.add('animate');
    setTimeout(() => {
        totalCaloriesEl.parentElement.classList.remove('animate');
    }, 500);
}

// Load profile into form
function loadProfile() {
    if (state.profile) {
        heightInput.value = state.profile.height || '';
        weightInput.value = state.profile.weight || '';
        goalSelect.value = state.profile.goal || 'maintenance';
        calorieGoalInput.value = state.calorieGoal;
        updateBMIDisplay();
    }
}

// Update BMI display
function updateBMIDisplay() {
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);

    if (height && weight && height > 0) {
        const bmi = weight / ((height / 100) ** 2);
        let category, categoryClass;

        if (bmi < 18.5) {
            category = 'Underweight';
            categoryClass = 'underweight';
        } else if (bmi < 25) {
            category = 'Normal';
            categoryClass = 'normal';
        } else if (bmi < 30) {
            category = 'Overweight';
            categoryClass = 'overweight';
        } else {
            category = 'Obese';
            categoryClass = 'obese';
        }

        bmiDisplay.innerHTML = `
      <span class="bmi-label">Your BMI</span>
      <span class="bmi-value">${bmi.toFixed(1)}</span>
      <span class="bmi-category ${categoryClass}">${category}</span>
    `;
    } else {
        bmiDisplay.innerHTML = '';
    }
}

// Save profile
async function saveProfile() {
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);
    const goal = goalSelect.value;
    const calorieGoal = parseInt(calorieGoalInput.value) || 2000;

    if (!height || !weight) {
        alert('Please enter both height and weight');
        return false;
    }

    state.profile = { height, weight, goal };
    state.calorieGoal = calorieGoal;

    localStorage.setItem('fitbuddy_profile', JSON.stringify(state.profile));
    localStorage.setItem('fitbuddy_calorie_goal', calorieGoal.toString());

    // Send profile to server
    try {
        await fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: state.sessionId,
                height,
                weight,
                goal: formatGoal(goal)
            }),
        });
    } catch (error) {
        console.error('Failed to save profile to server:', error);
    }

    updateCalorieDisplay();
    return true;
}

// Format goal for display
function formatGoal(goal) {
    const goals = {
        'weight_loss': 'Weight Loss',
        'weight_gain': 'Weight Gain',
        'maintenance': 'Maintain Weight',
        'muscle_building': 'Build Muscle'
    };
    return goals[goal] || goal;
}

// Initialize chat with welcome message
function initializeChat() {
    const hasVisited = localStorage.getItem('fitbuddy_visited');
    const hasProfile = state.profile && state.profile.height;

    if (!hasVisited) {
        localStorage.setItem('fitbuddy_visited', 'true');
        addBotMessage("Hey! 👋 I'm Fit Buddy, your nutrition companion!");
        setTimeout(() => {
            if (!hasProfile) {
                addBotMessage("Let's set up your profile first! Tap 'Set up profile' to add your height, weight, and fitness goals 🎯");
                showQuickReplies([
                    { text: "Set up profile 👤", value: "__OPEN_PROFILE__" },
                    { text: "Skip for now", value: "I'll set up my profile later." }
                ]);
            } else {
                addBotMessage("I'm here to help you build healthy eating habits—no calorie counting stress, just gentle check-ins! 🥗");
                showQuickReplies([
                    { text: "Sounds good! 👍", value: "Sounds good! I'm ready to start." },
                    { text: "What should I eat?", value: "What should I eat based on my fitness goals?" },
                    { text: "Had my meal 🍛", value: "I already had my meal today." }
                ]);
            }
        }, 1000);
    } else {
        const greeting = getTimeBasedGreeting();
        addBotMessage(greeting.message);
        if (greeting.quickReplies) {
            showQuickReplies(greeting.quickReplies);
        }
    }
}

// Get time-based greeting
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    const hasProfile = state.profile && state.profile.height;

    // Add profile setup option if not set
    const profileOption = hasProfile ?
        { text: "Update profile 👤", value: "__OPEN_PROFILE__" } :
        { text: "Set up profile 👤", value: "__OPEN_PROFILE__" };

    if (hour >= 5 && hour < 11) {
        return {
            message: "Good morning! ☀️ Did you manage to have breakfast today?",
            quickReplies: [
                { text: "Yes 👍", value: "Yes, I had breakfast!" },
                { text: "Skipped 😕", value: "I skipped breakfast today." },
                { text: "Just chai ☕", value: "Just had chai/tea for breakfast." }
            ]
        };
    } else if (hour >= 11 && hour < 15) {
        return {
            message: "Hey! 🍛 Lunch time—khaana ho gaya?",
            quickReplies: [
                { text: "Yes 👍", value: "Yes, had lunch!" },
                { text: "Not yet", value: "Haven't had lunch yet." },
                { text: "Ate light 🍲", value: "I ate something light for lunch." }
            ]
        };
    } else if (hour >= 15 && hour < 19) {
        return {
            message: "Afternoon! 😊 How's your eating going today?",
            quickReplies: [
                { text: "Had meals 👍", value: "I've had my meals today." },
                { text: "Skipped lunch 😕", value: "I skipped lunch today." },
                { text: "Need a snack 🍪", value: "Feeling like having a snack." }
            ]
        };
    } else {
        return {
            message: "Evening! 🌙 Hope you had a good day. Dinner plans?",
            quickReplies: [
                { text: "Yes 👍", value: "Yes, I had dinner!" },
                { text: "Not yet", value: "Haven't had dinner yet." },
                { text: "Eating light 🥗", value: "Planning to eat something light for dinner." }
            ]
        };
    }
}

// Setup event listeners
function setupEventListeners() {
    // Send message on button click
    sendBtn.addEventListener('click', handleSendMessage);

    // Send message on Enter key
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Toggle dropdown menu
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
    });

    // Reset chat
    resetChatBtn.addEventListener('click', async () => {
        dropdownMenu.classList.remove('active');
        await resetConversation();
    });

    // View progress
    viewProgressBtn.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
        updateProgress();
        progressModal.classList.add('active');
    });

    // Edit profile
    editProfileBtn.addEventListener('click', () => {
        dropdownMenu.classList.remove('active');
        loadProfile();
        profileModal.classList.add('active');
    });

    // Close modals
    closeModalBtn.addEventListener('click', () => {
        progressModal.classList.remove('active');
    });

    closeProfileModalBtn.addEventListener('click', () => {
        profileModal.classList.remove('active');
    });

    // Close modals on overlay click
    progressModal.addEventListener('click', (e) => {
        if (e.target === progressModal) {
            progressModal.classList.remove('active');
        }
    });

    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            profileModal.classList.remove('active');
        }
    });

    // Profile form
    heightInput.addEventListener('input', updateBMIDisplay);
    weightInput.addEventListener('input', updateBMIDisplay);

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saved = await saveProfile();
        if (saved) {
            profileModal.classList.remove('active');
            addBotMessage("Profile updated! 🎉 Now I can give you personalized advice. Ask me 'What should I eat?' anytime!");
            showQuickReplies([
                { text: "What should I eat?", value: "What should I eat based on my fitness goals and body?" },
                { text: "Thanks! 😊", value: "Thanks for the update!" }
            ]);
        }
    });
}

// Handle sending messages
async function handleSendMessage() {
    const message = messageInput.value.trim();

    if (!message || state.isTyping) return;

    // Check for special commands
    if (message === '__OPEN_PROFILE__') {
        messageInput.value = '';
        hideQuickReplies();
        loadProfile();
        profileModal.classList.add('active');
        return;
    }

    // Add user message to UI
    addUserMessage(message);

    // Clear input
    messageInput.value = '';

    // Hide quick replies
    hideQuickReplies();

    // Track meal-related messages
    trackMealMessage(message);

    // Send to API
    await sendToAPI(message);
}

// Send message to API
async function sendToAPI(message) {
    state.isTyping = true;
    sendBtn.disabled = true;

    // Show typing indicator
    const typingMessage = showTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sessionId: state.sessionId,
            }),
        });

        const data = await response.json();

        // Remove typing indicator
        typingMessage.remove();

        if (data.error) {
            addBotMessage(`Oops! ${data.error}`, true);
        } else {
            addBotMessage(data.response);

            // Add calories if returned
            if (data.calories) {
                addCalories(data.calories);
            }

            // Show contextual quick replies
            const quickReplies = generateQuickReplies(data.response);
            if (quickReplies.length > 0) {
                showQuickReplies(quickReplies);
            }
        }
    } catch (error) {
        typingMessage.remove();
        addBotMessage("Connection issue! Please check your internet and try again. 📶", true);
    } finally {
        state.isTyping = false;
        sendBtn.disabled = false;
        scrollToBottom();
    }
}

// Add bot message to UI
function addBotMessage(text, isError = false) {
    const message = document.createElement('div');
    message.className = `message bot${isError ? ' error' : ''}`;

    message.innerHTML = `
    <div class="message-avatar">🥗</div>
    <div class="message-content">
      <span class="message-sender">Fit Buddy</span>
      <div class="message-bubble">${formatMessage(text)}</div>
    </div>
  `;

    messagesArea.appendChild(message);
    scrollToBottom();
}

// Add user message to UI
function addUserMessage(text) {
    const message = document.createElement('div');
    message.className = 'message user';

    message.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content">
      <span class="message-sender">You</span>
      <div class="message-bubble">${escapeHtml(text)}</div>
    </div>
  `;

    messagesArea.appendChild(message);
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const message = document.createElement('div');
    message.className = 'message bot typing';

    message.innerHTML = `
    <div class="message-avatar">🥗</div>
    <div class="message-content">
      <span class="message-sender">Fit Buddy</span>
      <div class="message-bubble">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  `;

    messagesArea.appendChild(message);
    scrollToBottom();
    return message;
}

// Show quick replies
function showQuickReplies(replies) {
    quickRepliesContainer.innerHTML = '';

    replies.forEach(reply => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = reply.text;
        btn.addEventListener('click', () => {
            messageInput.value = reply.value;
            handleSendMessage();
        });
        quickRepliesContainer.appendChild(btn);
    });
}

// Hide quick replies
function hideQuickReplies() {
    quickRepliesContainer.innerHTML = '';
}

// Generate contextual quick replies based on bot response
function generateQuickReplies(response) {
    const lowerResponse = response.toLowerCase();

    // Check for meal-related context
    if (lowerResponse.includes('breakfast') || lowerResponse.includes('nashta')) {
        return [
            { text: "Had poha today 😋", value: "I had poha for breakfast today." },
            { text: "Just chai ☕", value: "Just had chai." },
            { text: "Skipped 😅", value: "Skipped breakfast." }
        ];
    }

    if (lowerResponse.includes('lunch') || lowerResponse.includes('khaana')) {
        return [
            { text: "Dal chawal 🍛", value: "Had dal chawal for lunch." },
            { text: "Roti sabzi", value: "Had roti sabzi." },
            { text: "Ordered in 🍱", value: "Ordered lunch from outside." }
        ];
    }

    if (lowerResponse.includes('dinner') || lowerResponse.includes('raat')) {
        return [
            { text: "Light meal 🥗", value: "Had a light dinner." },
            { text: "Khichdi 🍲", value: "Had khichdi for dinner." },
            { text: "Skip kr raha", value: "Thinking of skipping dinner." }
        ];
    }

    if (lowerResponse.includes('snack') || lowerResponse.includes('hungry')) {
        return [
            { text: "Fruit 🍎", value: "Had some fruits as snack." },
            { text: "Chai time ☕", value: "Had chai and biscuits." },
            { text: "Healthy munch", value: "Had some nuts or healthy snack." }
        ];
    }

    if (lowerResponse.includes('goal') || lowerResponse.includes('advice') || lowerResponse.includes('suggest')) {
        return [
            { text: "Update profile 👤", value: "__OPEN_PROFILE__" },
            { text: "More tips please", value: "Give me more tips for my fitness goal." },
            { text: "Thanks! 😊", value: "Thanks for the advice!" }
        ];
    }

    if (lowerResponse.includes('great') || lowerResponse.includes('good') || lowerResponse.includes('badhiya')) {
        return [
            { text: "Thanks! 😊", value: "Thanks! Feeling good about it." },
            { text: "What's next?", value: "What should I focus on next?" },
            { text: "Show progress 📊", value: "Can you show me my progress?" }
        ];
    }

    // Default quick replies
    return [
        { text: "Had a meal 👍", value: "I just had a meal." },
        { text: "What should I eat?", value: "What should I eat based on my fitness goals?" },
        { text: "How am I doing?", value: "How am I doing with my eating habits?" }
    ];
}

// Track meal-related messages
function trackMealMessage(message) {
    const lowerMessage = message.toLowerCase();
    const today = new Date().toDateString();

    // Check for meal indicators
    const mealKeywords = ['had', 'ate', 'eaten', 'lunch', 'dinner', 'breakfast', 'meal', 'food', 'khaaya', 'kha liya'];
    const positiveKeywords = ['yes', 'yeah', 'haan', 'ha', 'done', 'finished', '👍'];

    const hasMealKeyword = mealKeywords.some(k => lowerMessage.includes(k));
    const hasPositiveKeyword = positiveKeywords.some(k => lowerMessage.includes(k));

    if (hasMealKeyword || hasPositiveKeyword) {
        // Log the meal
        const existingLog = state.mealLog.find(log => log.date === today);
        if (existingLog) {
            existingLog.count++;
        } else {
            state.mealLog.push({ date: today, count: 1 });
        }

        // Update streak
        updateStreak();

        // Save to localStorage
        localStorage.setItem('fitbuddy_meals', JSON.stringify(state.mealLog));
    }
}

// Update streak count
function updateStreak() {
    const today = new Date();
    let streak = 0;

    // Check consecutive days
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toDateString();

        const hasLog = state.mealLog.find(log => log.date === dateStr);

        if (hasLog) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }

    state.streak = streak;
    localStorage.setItem('fitbuddy_streak', streak.toString());
}

// Update progress modal
function updateProgress() {
    // Update streak display
    streakCount.textContent = state.streak;

    // Update weekly bars
    weeklyBars.innerHTML = '';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const todayIndex = (today.getDay() + 6) % 7; // Monday = 0

    days.forEach((day, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = `day-bar${index === todayIndex ? ' today' : ''}`;

        // Calculate the date for this day of the week
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() - (todayIndex - index));
        const dateStr = dayDate.toDateString();

        // Check if there's a meal log for this day
        const log = state.mealLog.find(l => l.date === dateStr);
        const fillHeight = log ? Math.min(log.count * 33, 100) : 0;

        dayDiv.innerHTML = `
      <div class="bar">
        <div class="bar-fill" style="height: ${fillHeight}%"></div>
      </div>
      <span class="day-label">${day}</span>
    `;

        weeklyBars.appendChild(dayDiv);
    });

    // Update calorie history
    calorieHistory.innerHTML = '';
    days.forEach((day, index) => {
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() - (todayIndex - index));
        const dateStr = dayDate.toDateString();
        const calories = state.calorieLog[dateStr] || 0;

        const dayDiv = document.createElement('div');
        dayDiv.className = `calorie-day${index === todayIndex ? ' today' : ''}`;
        dayDiv.innerHTML = `
      <span class="calorie-day-name">${day}${index === todayIndex ? ' (Today)' : ''}</span>
      <span class="calorie-day-value">${calories} kcal</span>
    `;
        calorieHistory.appendChild(dayDiv);
    });

    // Update progress message
    if (state.streak === 0) {
        progressMessage.textContent = "Start logging meals to build your streak! 💪";
    } else if (state.streak < 3) {
        progressMessage.textContent = `Nice start! Keep it up for ${3 - state.streak} more days! 🌱`;
    } else if (state.streak < 7) {
        progressMessage.textContent = "You're building great habits! A week is close! 🔥";
    } else {
        progressMessage.textContent = "Amazing consistency! You're doing fantastic! 🏆";
    }
}

// Reset conversation
async function resetConversation() {
    try {
        await fetch('/api/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId: state.sessionId }),
        });

        // Clear messages area
        messagesArea.innerHTML = '';
        hideQuickReplies();

        // Reinitialize
        addBotMessage("Chat reset! 🔄 Let's start fresh. How can I help you today?");
        showQuickReplies([
            { text: "Check my meals 🍛", value: "Let's talk about my meals." },
            { text: "What should I eat?", value: "What should I eat based on my fitness goals?" },
            { text: "Update profile 👤", value: "__OPEN_PROFILE__" }
        ]);
    } catch (error) {
        addBotMessage("Couldn't reset chat. Please try again!", true);
    }
}

// Format message (handle line breaks)
function formatMessage(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll to bottom
function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}
