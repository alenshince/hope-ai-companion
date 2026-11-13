# 🌿 Hope — Personal AI Companion

Hope is an empathetic, high-capability personal AI companion application designed to help users research information, organize smart notes, and manage reminders seamlessly.

---

## ✨ Core Modules & Features

### 1. Research Assistant Module
- **Conversational & Search Interface**: Ask complex research inquiries in natural language.
- **Live Web Research & Scraping**: Leverages web search and article scraping to collect fresh, authoritative sources and synthesize key insights with inline bracketed citations (`[1]`, `[2]`).
- **Interactive Source Cards**: Displays domain badges, snippets, and verified source links for every reference.
- **One-Click to Notes**: Instantly transfer synthesized findings into your notes notebook with automatic tagging (`#research`, `#web-synthesis`) and citations.
- **Contextual Follow-Ups**: Intelligent follow-up prompts to drill deeper into the topic.

### 2. Smart Note-Taking Module
- **Folder & Categorization System**: Organize notes across folders (e.g., *Research, Projects, Ideas, Daily Notes, Quick Thoughts*) and custom tags.
- **Full Markdown Support**: Rich live editor with headings, checklists, code blocks, tables, blockquotes, and split-pane preview.
- **AI Clean Up**: Transforms raw, messy stream-of-consciousness thoughts into structured, executive-ready markdown.
- **Auto-Summarization**: Generates 2-sentence executive overviews displayed in an elegant banner.
- **Semantic Auto-Tagging**: Extracts high-relevance keyword tags automatically.

### 3. Reminder & Task Management Module
- **Natural Language Parsing (NLP)**: Understands phrases like:
  - *"Remind me to review research on quantum computing tomorrow at 5 PM"*
  - *"Call Sarah in 2 hours #urgent"*
  - *"Team sync next Monday at 10am"*
- **Adaptive Timelines**: Organizes reminders into *Due Today*, *Active*, *Upcoming*, and *Completed*.
- **Active Notifications & Calming Chimes**:
  - System browser notifications via Web Notifications API.
  - Soothing harmonic bell tones synthesized dynamically via Web Audio API (zero audio file dependencies).
  - In-app toast alerts with snooze options (+15m, +1h, tomorrow).

### 4. Voice Assistant Module (Hands-Free Speech Engine)
- **Web Speech API Integration**: Cross-browser speech recognition (`SpeechRecognition`) & speech synthesis (`SpeechSynthesis`) with natural vocal cadence.
- **Dynamic Audio Wave Indicator**: Interactive visual audio wave visualizer reflecting Hope's voice states (`idle`, `listening`, `processing`, `speaking`) with fluid animated sine waves and glowing gradients.
- **Voice Command Intent Engine**: Hands-free vocal execution for:
  - Reminders: *"Hey Hope, remind me to submit Flutter UI tomorrow at 4 PM"*
  - Research: *"Hope, search for latest WebGPU features in Flutter"*
  - Notes: *"Hope, take a note that Hack Till Dawn registration starts next Monday"*
  - Health: *"Hope, log 1 glass of water"*, *"Hope, log dinner"*
  - Identity: *"Hope, who am I and what are my projects?"*
- **Continuous Hands-Free Conversation**: Automatically re-engages microphone when Hope completes vocal playback for seamless back-and-forth dialogue.
- **In-Chat Audio Controls**: Integrated speech input button and individual Read Aloud controls for synthesized responses.

### 5. Personalized Context & Memory Engine (The "About Me" Core)
- **Dedicated User Profile**: Pre-loaded and indexed profile for **Alen Shince**, S5 Computer Science & Engineering student at **MBCCET** (Mar Baselios Christian College of Engineering & Technology, Peermade).
- **Domain & Tech Stack Mastery**: Deep indexing across **Figma, Flutter, Java, Python, UI/UX, and graphic design**.
- **Leadership & Hackathons**: Highlighting role as **HIVE Creative Team Lead & Event Coordinator**, coordinating flagship initiatives like the 24-hour **Hack Till Dawn** hackathon and **Smart India Hackathon (SIH)** internal rounds.
- **Project History**:
  - **NerReksha**: Offline-first disaster resilience and emergency PWA.
  - **Rock**: Voice-enabled personal AI companion.
  - **HIVE Design Systems**: Comprehensive branding, visual hierarchy, and event portals.
- **Professional Profiles**: Seamless indexing of GitHub (`https://github.com/alenshince`) and LinkedIn profile data.
- **Dynamic Memory Bank**: Interactive memory core allowing Alen to view indexed memories, filter by category, teach Hope new facts, toggle active status, and inspect the exact injected AI prompt context.

### 6. Health & Lifestyle Guardian Module
- **Proactive Check-Ins & Threshold Alerts**:
  - **Meal Thresholds**: Gentle reminders when approaching **Lunch** (12:30 - 2:30 PM) or **Dinner** (7:30 - 9:30 PM) windows.
  - **Late Night Guardian**: Prompts to save work, step away, and rest when operating past 10:30 PM.
  - **Hydration Tracker**: Interactive 8-glass water tracker with quick logging and daily progress percentages.
- **Focus & Break Companion**:
  - **20-20-20 Rule**: Prompts to look 20 feet away for 20 seconds during extended screen sessions.
  - **Guided Breathing Circle**: Calming 4-4-4 rhythm animation (Inhale, Hold, Exhale) to reduce cognitive strain.
- **Mood & Energy Check-In**: Quick emotional state logger (Deep Focus, Calm, Energized, Fatigued, Stressed) with adaptive tone alignment.
- **Routine Consistency Dashboard**: 7-day habit trend score, active streak counter, and real-time check-in logs.

### 7. Calming UI & Resilient Architecture
- **Palette**: Soft cerulean, calming slate navy, gentle porcelain neutrals, and warm amber accents.
- **Dual AI Engine**: Operates seamlessly out-of-the-box using Hope's built-in analytical engine, and connects seamlessly to Google Gemini 2.0 / 1.5 Flash when an API key is provided in Settings or `.env`.
- **Atomic Data Persistence**: Safe, transactional JSON database in `server/data/`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
From the project root (`C:\Users\annma\.gemini\antigravity\scratch\hope-ai-companion`):

```bash
# Install all dependencies (server & client)
npm run install:all
```

### Running the Application

#### Option A: Unified Server (API + Built Frontend)
```bash
# Run server (serves API & UI at http://localhost:5001)
npm run server
```

#### Option B: Full Development Mode (Hot-Reloading)
```bash
# Terminal 1: Run Express API Server (port 5001)
npm run server:dev

# Terminal 2: Run Vite Client (port 3000)
npm run client
```

Open your browser to [http://localhost:5001](http://localhost:5001) or [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Architecture

```
hope-ai-companion/
├── package.json               # Root workspace scripts
├── server/                    # Node.js + Express backend
│   ├── src/
│   │   ├── index.js           # Server entry point & static file hosting
│   │   ├── db.js              # Atomic JSON persistence & starter seeds
│   │   ├── services/
│   │   │   ├── search.js      # Web search & article text extraction
│   │   │   ├── ai.js          # Gemini integration & built-in Hope engine
│   │   │   └── nlp.js         # Chrono-node natural language date parser
│   │   ├── routes/
│   │   │   ├── chat.js        # Research, chat & voice command endpoints
│   │   │   ├── notes.js       # Notes CRUD, AI cleanup, summarize, tags
│   │   │   ├── reminders.js   # NLP parsing, snooze, due alerts
│   │   │   ├── settings.js    # AI model configuration & diagnostics
│   │   │   ├── profile.js     # User profile & indexed memory context
│   │   │   └── wellness.js    # Health guardian, hydration & threshold checks
│   │   ├── test-backend.js    # Core loops verification test suite
│   │   └── test-full-integration.js # Full 3-module integration verification suite
│   └── data/                  # Persistent data stores (profile, memories, wellness, etc.)
└── client/                    # Vite + React + Tailwind CSS
    ├── src/
    │   ├── main.jsx           # React DOM root
    │   ├── App.jsx            # State management, proactive guardian & voice overlay
    │   ├── api.js             # Client API service for all modules
    │   ├── utils/
    │   │   ├── audio.js       # Web Audio API harmonic chime synthesizer
    │   │   ├── notifications.js # Browser notification permission manager
    │   │   └── speech.js      # Web Speech API recognition & synthesis wrapper
    │   └── components/
    │       ├── Sidebar.jsx
    │       ├── Header.jsx     # Voice toggle with mini audio wave indicator
    │       ├── Toast.jsx
    │       ├── Voice/
    │       │   ├── AudioWaveVisualizer.jsx # Dynamic waveform indicator (idle/listening/speaking)
    │       │   └── VoiceAssistantModal.jsx # Hands-free companion overlay
    │       ├── AboutMe/
    │       │   └── AboutMeDashboard.jsx    # Alen Shince profile, projects & memory bank
    │       ├── HealthGuardian/
    │       │   └── HealthGuardianDashboard.jsx # Hydration, meals, breaks & habits
    │       ├── ResearchAssistant/
    │       │   ├── ResearchChat.jsx        # With voice mic & read aloud controls
    │       │   ├── SourceCard.jsx
    │       │   └── SaveToNotesModal.jsx
    │       ├── SmartNotes/
    │       │   ├── NotesLayout.jsx
    │       │   ├── NoteEditor.jsx
    │       │   └── FolderSidebar.jsx
    │       ├── Reminders/
    │       │   ├── RemindersDashboard.jsx
    │       │   ├── ReminderCard.jsx
    │       │   └── ReminderModal.jsx
    │       └── Settings/
    │           └── SettingsModal.jsx
```

