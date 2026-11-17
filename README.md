# 🌿 Hope — Intelligent Bilingual AI Companion

**Hope** (ഹോപ്പ്) is a warm, intellectually sharp, deeply caring, and bilingual (Malayalam + English) personal AI companion. Designed with an elder sister or motherly presence (ചേച്ചി / സ്നേഹമുള്ള കൂട്ട്), Hope supports academic research, smart note-taking, NLP reminders, proactive health guardianship, and deep personalization.

---

## ✨ Upgraded Feature Modules

### 1. Provider-Agnostic Reasoning & Research Engine
- **Provider-Agnostic Architecture**: Swappable LLM provider interface (`server/src/services/llm/`). Defaults to **Google Gemini** (Gemini 2.0 Flash for chat, Gemini 1.5 Pro for deep reasoning), with drop-in support for OpenAI, Anthropic Claude, or local Ollama.
- **Agent Reasoning Loop**: Automatic intent classifier routes conversational queries to fast Flash models and complex queries to Pro reasoning models.
- **Autonomous Tool Dispatcher**:
  - `web_search`: Live search cross-checking at least 2 trusted sources with verified Markdown citations.
  - `url_fetch`: High-speed article inspection with strict SSRF defense (blocking private, loopback, and cloud metadata IP ranges).
  - `calculator`: Safe recursive-descent math parser (zero `eval()`).
- **Real-Time Streaming**: Server-Sent Events (`POST /api/chat/stream`) emitting live tokens and brief dynamic `thinking...` status banners.

### 2. Companion Personality & Bilingual Speech Engine
- **Persona & Guardrails**: Affectionate, patient elder-sister demeanor (ചേച്ചി). Strictly non-human identity, zero guilt-tripping or manipulation, and encouraging of real-world human relationships.
- **Dynamic Language Detection**: Identifies whether user input is Malayalam Unicode script, Manglish (Malayalam written in Latin alphabet), English, or natural code-switching.
- **Natural Spoken Malayalam**: Uses everyday conversational phrasing (സംസാര ഭാഷ) rather than stiff textbook literal translations.
- **User Preference**: Auto-detection, Malayalam-only, English-only, or Mixed mode configurable in Settings.

### 3. Female Neural Voice (STT & TTS)
- **Neural Cloud Voices**: Microsoft Edge TTS streaming high-fidelity neural female voices:
  - Malayalam: `ml-IN-SobhanaNeural`
  - Indian English: `en-IN-NeerjaNeural`
- **Spoken Text Sanitizer**: Pre-processes text before synthesis by stripping Markdown syntax, code blocks, URLs, and emojis. Automatically converts Manglish phonetic tokens to Malayalam Unicode script for natural neural pronunciation.
- **Resilient Fallback**: Graceful fallback to browser `window.speechSynthesis` when offline.
- **Audio Cache & Rate Limiting**: In-memory and disk caching with SHA-256 keys, capped with a sliding-window rate limiter (30 req/min).
- **Interactive Voice Controls**: Live audio wave visualizer, playback speed control (0.75x, 1.0x, 1.25x), language toggle (`en-IN` / `ml-IN`), and instant interrupt capability.

### 4. Health & Wellbeing Guardian
- **Red-Flag Emergency Triage**: Detects critical emergencies (chest pain, stroke signs, breathing difficulty, severe bleeding, self-harm, suicidal ideation) and immediately halts normal conversational flow to deliver compassionate crisis support with national hotlines:
  - **India Emergency**: **112**
  - **Ambulance**: **108**
  - **Tele-MANAS (24/7 Mental Health Helpline)**: **14416** or **1800-891-4416**
- **Non-Doctor Guardrails**: Strictly educational; no diagnosis, no prescriptions, and no dosage modifications.
- **Scheduled Medicine Tracker**: Add medications, track doses, and receive proactive reminders.
- **Encrypted Mood Journal**: Sensitive personal reflections encrypted at rest using **AES-256-GCM**.
- **India DPDP Act 2023 & GDPR Compliance**: Single-click data portability export (`GET /api/wellness/export`) and complete erasure (`DELETE /api/wellness/delete-all`).

### 5. Profile Links & Context Personalization
- **SSRF-Protected URL Validator**: Enforces HTTPS and host allowlists (`github.com`, `linkedin.com`, `instagram.com`), while stripping tracking parameters and blocking internal IP resolution.
- **Official Public GitHub Sync**: Queries the official public GitHub REST API with user consent (no scraping) to index public repositories, stars, and programming languages.
- **Terms-of-Service Protection**: Explicit no-scraping policy for LinkedIn and Instagram, providing dedicated secure inputs for headlines and creative bios.
- **Prompt-Injection Defense**: Wraps external context inside `<untrusted_user_content>` delimiters with strict instruction neutralization to protect against jailbreaks.
- **Context Review**: User can review, edit, or purge their compiled AI context profile at any time.

### 6. Companion Management & Multi-User Isolation
- **SQLite Storage**: Powered by `better-sqlite3` in Write-Ahead Logging (WAL) mode for transactional durability.
- **Multi-User Isolation**: Email + password registration, bcrypt password hashing, and JWT tokens stored in `httpOnly`, `SameSite` cookies with login brute-force rate limiting. All database queries are strictly isolated by `user_id`.
- **Quiet Hours**: Configurable quiet hours (e.g., 10:00 PM - 07:00 AM) suppressing proactive audible chimes.
- **Self-Hosted Malayalam Typography**: Configured with **Noto Sans Malayalam** for body text and **Manjari** for headings.

---

## 🛠️ Configuration & Environment Variables

Copy `.env.example` to `server/.env` and configure your keys:

```env
# Server
PORT=5001
NODE_ENV=development

# LLM Configuration (Gemini primary, OpenAI/Claude swappable)
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_FLASH_MODEL=gemini-2.0-flash
GEMINI_PRO_MODEL=gemini-1.5-pro

# Text-to-Speech
TTS_PROVIDER=edge
TTS_FEMALE_VOICE_ML=ml-IN-SobhanaNeural
TTS_FEMALE_VOICE_EN=en-IN-NeerjaNeural

# Security & Data Protection
JWT_SECRET=replace_with_a_secure_random_64_char_key
HEALTH_DATA_KEY=32_byte_hex_or_secret_for_aes_256_gcm
```

---

## 🧪 Test Verification

Run all test suites across the 6 modules:

```bash
# Run all unit and integration test suites
cd server
node src/tests/module1-reasoning.test.js
node src/tests/bilingual-personality.test.js
node src/tests/module3-voice.test.js
node src/tests/module4-health.test.js
node src/tests/module5-personalization.test.js
node src/tests/module6-companion-mgmt.test.js
```

---

## 🚀 Running the App

```bash
# 1. Install dependencies
npm run install:all

# 2. Build the client
npm run build:client

# 3. Start the unified server
npm run server
```

Open your browser at **http://localhost:5001**.
