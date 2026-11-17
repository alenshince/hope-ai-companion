import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { sqliteDb } from '../services/db/sqlite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, `backup_json_${Date.now()}`);

console.log('==================================================');
console.log('🔄 STARTING ONE-TIME JSON TO SQLITE MIGRATION');
console.log('==================================================');

// 1. Create Backup Directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const jsonFiles = [
  'notes.json',
  'reminders.json',
  'folders.json',
  'settings.json',
  'profile.json',
  'memories.json',
  'wellness.json'
];

console.log('\n[1/3] Backing up existing JSON data files...');
for (const file of jsonFiles) {
  const src = path.join(DATA_DIR, file);
  if (fs.existsSync(src)) {
    const dest = path.join(BACKUP_DIR, file);
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Backed up ${file} -> ${path.relative(DATA_DIR, dest)}`);
  }
}

function readJsonSafe(filename, fallback = null) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Warning reading ${filename}:`, err.message);
    return fallback;
  }
}

// 2. Initialize Default Primary User (Alen Shince)
console.log('\n[2/3] Setting up primary user account (Alen Shince)...');
const DEFAULT_USER_ID = 'user-alen-shince';
const DEFAULT_EMAIL = 'alen@hope.local';
const DEFAULT_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || 'AlenHope@2026!';
const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, salt);

const insertUserStmt = sqliteDb.prepare(`
  INSERT INTO users (id, email, password_hash, name, created_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email
`);
insertUserStmt.run(DEFAULT_USER_ID, DEFAULT_EMAIL, passwordHash, 'Alen Shince', new Date().toISOString());
console.log(`  ✓ Primary user created/verified: ${DEFAULT_EMAIL} (${DEFAULT_USER_ID})`);

// 3. Migrate All Tables within an Atomic Transaction
console.log('\n[3/3] Migrating entities into SQLite...');
const migrateTx = sqliteDb.transaction(() => {
  // 3a. Profile
  const profileData = readJsonSafe('profile.json');
  if (profileData) {
    const upsertProfile = sqliteDb.prepare(`
      INSERT INTO profiles (user_id, name, title, institution, branch, semester, bio, tech_stack_json, projects_json, links_json, external_data_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name = excluded.name,
        title = excluded.title,
        institution = excluded.institution,
        branch = excluded.branch,
        semester = excluded.semester,
        bio = excluded.bio,
        tech_stack_json = excluded.tech_stack_json,
        projects_json = excluded.projects_json,
        links_json = excluded.links_json,
        external_data_json = excluded.external_data_json,
        updated_at = excluded.updated_at
    `);
    upsertProfile.run(
      DEFAULT_USER_ID,
      profileData.name || 'Alen Shince',
      profileData.title || '',
      profileData.institution || '',
      profileData.branch || '',
      profileData.semester || '',
      profileData.bio || '',
      JSON.stringify(profileData.techStack || []),
      JSON.stringify(profileData.projects || []),
      JSON.stringify(profileData.links || {}),
      JSON.stringify(profileData.externalData || {}),
      new Date().toISOString()
    );
    console.log('  ✓ Migrated Profile & Projects');
  }

  // 3b. Settings
  const settingsData = readJsonSafe('settings.json');
  if (settingsData) {
    const upsertSettings = sqliteDb.prepare(`
      INSERT INTO settings (user_id, gemini_api_key, model, language_preference, sound_enabled, use_web_search, voice_enabled, voice_auto_read, hands_free_mode, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        gemini_api_key = excluded.gemini_api_key,
        model = excluded.model,
        language_preference = excluded.language_preference,
        sound_enabled = excluded.sound_enabled,
        use_web_search = excluded.use_web_search,
        voice_enabled = excluded.voice_enabled,
        voice_auto_read = excluded.voice_auto_read,
        hands_free_mode = excluded.hands_free_mode,
        quiet_hours_enabled = excluded.quiet_hours_enabled,
        quiet_hours_start = excluded.quiet_hours_start,
        quiet_hours_end = excluded.quiet_hours_end,
        updated_at = excluded.updated_at
    `);
    upsertSettings.run(
      DEFAULT_USER_ID,
      settingsData.geminiApiKey || '',
      settingsData.model || 'gemini-2.0-flash',
      settingsData.languagePreference || 'auto',
      settingsData.soundEnabled ? 1 : 0,
      settingsData.useWebSearch ? 1 : 0,
      settingsData.voiceEnabled ? 1 : 0,
      settingsData.voiceAutoRead ? 1 : 0,
      settingsData.handsFreeMode ? 1 : 0,
      settingsData.quietHoursEnabled ? 1 : 0,
      settingsData.quietHoursStart || '22:00',
      settingsData.quietHoursEnd || '07:00',
      new Date().toISOString()
    );
    console.log('  ✓ Migrated Settings & Quiet Hours');
  }

  // 3c. Folders
  const foldersData = readJsonSafe('folders.json') || ['Research', 'Projects', 'Ideas'];
  const insertFolder = sqliteDb.prepare(`
    INSERT OR IGNORE INTO folders (id, user_id, name, created_at)
    VALUES (?, ?, ?, ?)
  `);
  for (const folder of foldersData) {
    insertFolder.run(`fld-${crypto.randomUUID()}`, DEFAULT_USER_ID, folder, new Date().toISOString());
  }
  console.log(`  ✓ Migrated ${foldersData.length} Folders`);

  // 3d. Notes
  const notesData = readJsonSafe('notes.json') || [];
  const insertNote = sqliteDb.prepare(`
    INSERT OR REPLACE INTO notes (id, user_id, title, content, folder, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const note of notesData) {
    insertNote.run(
      note.id || `note-${crypto.randomUUID()}`,
      DEFAULT_USER_ID,
      note.title || 'Untitled Note',
      note.content || '',
      note.folder || 'Research',
      JSON.stringify(note.tags || []),
      note.createdAt || new Date().toISOString(),
      note.updatedAt || new Date().toISOString()
    );
  }
  console.log(`  ✓ Migrated ${notesData.length} Notes`);

  // 3e. Reminders
  const remindersData = readJsonSafe('reminders.json') || [];
  const insertReminder = sqliteDb.prepare(`
    INSERT OR REPLACE INTO reminders (id, user_id, title, due_at, priority, status, category, notified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const rem of remindersData) {
    insertReminder.run(
      rem.id || `rem-${crypto.randomUUID()}`,
      DEFAULT_USER_ID,
      rem.title || 'Reminder',
      rem.dueAt || new Date().toISOString(),
      rem.priority || 'normal',
      rem.status || 'pending',
      rem.category || 'General',
      rem.notified ? 1 : 0,
      rem.createdAt || new Date().toISOString()
    );
  }
  console.log(`  ✓ Migrated ${remindersData.length} Reminders`);

  // 3f. Memories
  const memoriesData = readJsonSafe('memories.json') || [];
  const insertMemory = sqliteDb.prepare(`
    INSERT OR REPLACE INTO memories (id, user_id, category, title, content, tags, importance, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const mem of memoriesData) {
    insertMemory.run(
      mem.id || `mem-${crypto.randomUUID()}`,
      DEFAULT_USER_ID,
      mem.category || 'general',
      mem.title || 'Context Fact',
      mem.content || '',
      JSON.stringify(mem.tags || []),
      mem.importance || 'normal',
      mem.isActive !== false ? 1 : 0,
      mem.createdAt || new Date().toISOString()
    );
  }
  console.log(`  ✓ Migrated ${memoriesData.length} Memories`);

  // 3g. Wellness & Medicines
  const wellnessData = readJsonSafe('wellness.json');
  if (wellnessData) {
    const todayStr = wellnessData.date || new Date().toISOString().split('T')[0];
    const upsertWellness = sqliteDb.prepare(`
      INSERT OR REPLACE INTO wellness (user_id, date, water_glasses, target_water, meals_json, work_minutes, breaks_taken, last_break_at, mood_rating, mood_label, mood_note, streak_days, consistency_score, settings_json, check_in_logs_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    upsertWellness.run(
      DEFAULT_USER_ID,
      todayStr,
      wellnessData.waterGlasses || 0,
      wellnessData.targetWaterGlasses || 8,
      JSON.stringify(wellnessData.meals || {}),
      wellnessData.workMinutes || 0,
      wellnessData.breaksTaken || 0,
      wellnessData.lastBreakAt || null,
      wellnessData.mood?.rating || 'calm',
      wellnessData.mood?.label || 'Calm',
      wellnessData.mood?.note || '',
      wellnessData.streakDays || 1,
      wellnessData.consistencyScore || 90,
      JSON.stringify(wellnessData.settings || {}),
      JSON.stringify(wellnessData.checkInLogs || [])
    );

    // Medicines
    const insertMed = sqliteDb.prepare(`
      INSERT OR REPLACE INTO medicines (id, user_id, name, dosage, time, category, taken_today, last_taken_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const med of wellnessData.medicines || []) {
      insertMed.run(
        med.id || `med-${crypto.randomUUID()}`,
        DEFAULT_USER_ID,
        med.name,
        med.dosage || '',
        med.time || '09:00',
        med.category || 'supplement',
        med.takenToday ? 1 : 0,
        med.lastTakenAt || null,
        med.createdAt || new Date().toISOString()
      );
    }

    // Health Consent
    if (wellnessData.healthConsent) {
      const upsertConsent = sqliteDb.prepare(`
        INSERT OR REPLACE INTO health_consent (user_id, consent_given, country, consent_timestamp)
        VALUES (?, ?, ?, ?)
      `);
      upsertConsent.run(
        DEFAULT_USER_ID,
        wellnessData.healthConsent.consentGiven ? 1 : 0,
        wellnessData.healthConsent.country || 'IN',
        wellnessData.healthConsent.consentTimestamp || new Date().toISOString()
      );
    }
    console.log('  ✓ Migrated Wellness, Medicines, and Health Consent');
  }
});

migrateTx();

console.log('\n==================================================');
console.log('🎉 ONE-TIME MIGRATION TO SQLITE COMPLETED SUCCESSFULLY!');
console.log(`📂 Original JSON files preserved in: ${BACKUP_DIR}`);
console.log('==================================================');
