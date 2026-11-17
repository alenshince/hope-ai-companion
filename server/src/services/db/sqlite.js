import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'hope.sqlite3');

export const sqliteDb = new Database(DB_PATH);

// Configure SQLite for high performance and integrity
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('foreign_keys = ON');

// Initialize schema
sqliteDb.exec(`
  -- Users table for multi-user isolation
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Notes table
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    folder TEXT NOT NULL DEFAULT 'General',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);

  -- Reminders table
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    due_at TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    category TEXT NOT NULL DEFAULT 'General',
    notified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);

  -- Folders table
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Persistent Memories table
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    importance TEXT NOT NULL DEFAULT 'normal',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);

  -- User Settings table (including Quiet Hours and Tone)
  CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    gemini_api_key TEXT DEFAULT '',
    model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    language_preference TEXT NOT NULL DEFAULT 'auto',
    sound_enabled INTEGER NOT NULL DEFAULT 1,
    use_web_search INTEGER NOT NULL DEFAULT 1,
    voice_enabled INTEGER NOT NULL DEFAULT 1,
    voice_auto_read INTEGER NOT NULL DEFAULT 1,
    hands_free_mode INTEGER NOT NULL DEFAULT 0,
    quiet_hours_enabled INTEGER NOT NULL DEFAULT 0,
    quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
    quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- User Profile & Personal Context table
  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    institution TEXT NOT NULL,
    branch TEXT NOT NULL,
    semester TEXT NOT NULL,
    bio TEXT NOT NULL,
    tech_stack_json TEXT NOT NULL DEFAULT '[]',
    projects_json TEXT NOT NULL DEFAULT '[]',
    links_json TEXT NOT NULL DEFAULT '{}',
    external_data_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Daily Wellness Tracker table
  CREATE TABLE IF NOT EXISTS wellness (
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    water_glasses INTEGER NOT NULL DEFAULT 0,
    target_water INTEGER NOT NULL DEFAULT 8,
    meals_json TEXT NOT NULL DEFAULT '{}',
    work_minutes INTEGER NOT NULL DEFAULT 0,
    breaks_taken INTEGER NOT NULL DEFAULT 0,
    last_break_at TEXT,
    mood_rating TEXT NOT NULL DEFAULT 'calm',
    mood_label TEXT NOT NULL DEFAULT 'Calm',
    mood_note TEXT NOT NULL DEFAULT '',
    streak_days INTEGER NOT NULL DEFAULT 1,
    consistency_score INTEGER NOT NULL DEFAULT 90,
    settings_json TEXT NOT NULL DEFAULT '{}',
    check_in_logs_json TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Scheduled Medicines table
  CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    time TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'prescription',
    taken_today INTEGER NOT NULL DEFAULT 0,
    last_taken_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_medicines_user ON medicines(user_id);

  -- Encrypted Mood Journal (AES-256-GCM at rest)
  CREATE TABLE IF NOT EXISTS mood_journal (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    rating TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    encrypted_payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_mood_journal_user ON mood_journal(user_id);

  -- DPDP Act / GDPR Health Consent table
  CREATE TABLE IF NOT EXISTS health_consent (
    user_id TEXT PRIMARY KEY,
    consent_given INTEGER NOT NULL DEFAULT 0,
    country TEXT NOT NULL DEFAULT 'IN',
    consent_timestamp TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

console.log('📦 SQLite database initialized at:', DB_PATH);
