import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sqliteDb } from './sqlite.js';
import { encryptHealthData, decryptHealthData } from '../health/crypto.js';

export const DEFAULT_USER_ID = 'user-alen-shince';

export const dbRepo = {
  // 1. User & Authentication Repository
  createUser({ email, password, name }) {
    const id = `user-${crypto.randomUUID()}`;
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const created_at = new Date().toISOString();

    const insert = sqliteDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insert.run(id, email.toLowerCase().trim(), password_hash, name.trim(), created_at);

    // Initialize default settings, profile, and folders for the new user
    this.initUserDefaults(id, name);

    return { id, email, name, created_at };
  },

  findUserByEmail(email) {
    if (!email) return null;
    const stmt = sqliteDb.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase().trim()) || null;
  },

  findUserById(id) {
    if (!id) return null;
    const stmt = sqliteDb.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?');
    return stmt.get(id) || null;
  },

  verifyPassword(user, password) {
    if (!user || !user.password_hash || !password) return false;
    return bcrypt.compareSync(password, user.password_hash);
  },

  initUserDefaults(userId, name) {
    const now = new Date().toISOString();

    // Default folders
    const insertFolder = sqliteDb.prepare('INSERT OR IGNORE INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)');
    for (const f of ['Research', 'Projects', 'Ideas']) {
      insertFolder.run(`fld-${crypto.randomUUID()}`, userId, f, now);
    }

    // Default settings with quiet hours
    const insertSettings = sqliteDb.prepare(`
      INSERT OR IGNORE INTO settings (user_id, gemini_api_key, model, language_preference, sound_enabled, use_web_search, voice_enabled, voice_auto_read, hands_free_mode, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at)
      VALUES (?, '', 'gemini-2.0-flash', 'auto', 1, 1, 1, 1, 0, 0, '22:00', '07:00', ?)
    `);
    insertSettings.run(userId, now);

    // Default profile
    const insertProfile = sqliteDb.prepare(`
      INSERT OR IGNORE INTO profiles (user_id, name, title, institution, branch, semester, bio, tech_stack_json, projects_json, links_json, external_data_json, updated_at)
      VALUES (?, ?, 'Creative Developer & Student', 'Mar Baselios Christian College of Engineering and Technology (MBCCET)', 'Computer Science & Engineering', 'Semester 5 (S5)', 'AI companion user', '[]', '[]', '{}', '{}', ?)
    `);
    insertProfile.run(userId, name, now);
  },

  // 2. Profile & Context
  getProfile(userId = DEFAULT_USER_ID) {
    const stmt = sqliteDb.prepare('SELECT * FROM profiles WHERE user_id = ?');
    const row = stmt.get(userId);
    if (!row) return null;

    return {
      id: row.user_id,
      name: row.name,
      title: row.title,
      institution: row.institution,
      branch: row.branch,
      semester: row.semester,
      bio: row.bio,
      techStack: JSON.parse(row.tech_stack_json || '[]'),
      projects: JSON.parse(row.projects_json || '[]'),
      links: JSON.parse(row.links_json || '{}'),
      externalData: JSON.parse(row.external_data_json || '{}'),
      updatedAt: row.updated_at
    };
  },

  updateProfile(userId = DEFAULT_USER_ID, data = {}) {
    const current = this.getProfile(userId) || {};
    const updated = { ...current, ...data };
    const now = new Date().toISOString();

    const stmt = sqliteDb.prepare(`
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
    stmt.run(
      userId,
      updated.name || 'Alen Shince',
      updated.title || '',
      updated.institution || '',
      updated.branch || '',
      updated.semester || '',
      updated.bio || '',
      JSON.stringify(updated.techStack || []),
      JSON.stringify(updated.projects || []),
      JSON.stringify(updated.links || {}),
      JSON.stringify(updated.externalData || {}),
      now
    );

    return this.getProfile(userId);
  },

  // 3. Memories
  getMemories(userId = DEFAULT_USER_ID) {
    const stmt = sqliteDb.prepare('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId);
    return rows.map(r => ({
      id: r.id,
      category: r.category,
      title: r.title,
      content: r.content,
      tags: JSON.parse(r.tags || '[]'),
      importance: r.importance,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at
    }));
  },

  createMemory(userId = DEFAULT_USER_ID, data = {}) {
    const id = data.id || `mem-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const stmt = sqliteDb.prepare(`
      INSERT INTO memories (id, user_id, category, title, content, tags, importance, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      data.category || 'general',
      data.title || 'Personal Note',
      data.content || '',
      JSON.stringify(data.tags || []),
      data.importance || 'normal',
      data.isActive !== false ? 1 : 0,
      now
    );
    return { id, userId, ...data, createdAt: now };
  },

  updateMemory(userId = DEFAULT_USER_ID, id, data = {}) {
    const stmt = sqliteDb.prepare('SELECT * FROM memories WHERE id = ? AND user_id = ?');
    const existing = stmt.get(id, userId);
    if (!existing) return null;

    const updated = {
      category: data.category !== undefined ? data.category : existing.category,
      title: data.title !== undefined ? data.title : existing.title,
      content: data.content !== undefined ? data.content : existing.content,
      tags: data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
      importance: data.importance !== undefined ? data.importance : existing.importance,
      is_active: data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.is_active
    };

    const updateStmt = sqliteDb.prepare(`
      UPDATE memories SET
        category = ?, title = ?, content = ?, tags = ?, importance = ?, is_active = ?
      WHERE id = ? AND user_id = ?
    `);
    updateStmt.run(updated.category, updated.title, updated.content, updated.tags, updated.importance, updated.is_active, id, userId);

    return {
      id,
      category: updated.category,
      title: updated.title,
      content: updated.content,
      tags: JSON.parse(updated.tags),
      importance: updated.importance,
      isActive: Boolean(updated.is_active),
      createdAt: existing.created_at
    };
  },

  deleteMemory(userId = DEFAULT_USER_ID, id) {
    const stmt = sqliteDb.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?');
    stmt.run(id, userId);
    return true;
  },

  // 4. Notes
  getNotes(userId = DEFAULT_USER_ID) {
    const stmt = sqliteDb.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC');
    return stmt.all(userId).map(r => ({
      id: r.id,
      title: r.title,
      content: r.content,
      folder: r.folder,
      tags: JSON.parse(r.tags || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  createNote(userId = DEFAULT_USER_ID, data = {}) {
    const id = data.id || `note-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const stmt = sqliteDb.prepare(`
      INSERT INTO notes (id, user_id, title, content, folder, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      data.title || 'Untitled Note',
      data.content || '',
      data.folder || 'Research',
      JSON.stringify(data.tags || []),
      now,
      now
    );
    return { id, userId, ...data, createdAt: now, updatedAt: now };
  },

  updateNote(userId = DEFAULT_USER_ID, id, data = {}) {
    const existing = sqliteDb.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = {
      title: data.title !== undefined ? data.title : existing.title,
      content: data.content !== undefined ? data.content : existing.content,
      folder: data.folder !== undefined ? data.folder : existing.folder,
      tags: data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags
    };

    sqliteDb.prepare(`
      UPDATE notes SET title = ?, content = ?, folder = ?, tags = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(updated.title, updated.content, updated.folder, updated.tags, now, id, userId);

    return { id, ...updated, tags: JSON.parse(updated.tags), updatedAt: now, createdAt: existing.created_at };
  },

  deleteNote(userId = DEFAULT_USER_ID, id) {
    sqliteDb.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId);
    return true;
  },

  // 5. Folders
  getFolders(userId = DEFAULT_USER_ID) {
    const rows = sqliteDb.prepare('SELECT name FROM folders WHERE user_id = ? ORDER BY name ASC').all(userId);
    return rows.map(r => r.name);
  },

  createFolder(userId = DEFAULT_USER_ID, name) {
    const id = `fld-${crypto.randomUUID()}`;
    sqliteDb.prepare('INSERT OR IGNORE INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(id, userId, name.trim(), new Date().toISOString());
    return this.getFolders(userId);
  },

  deleteFolder(userId = DEFAULT_USER_ID, name) {
    sqliteDb.prepare('DELETE FROM folders WHERE user_id = ? AND name = ?').run(userId, name);
    // Reassign notes to General
    sqliteDb.prepare('UPDATE notes SET folder = ? WHERE user_id = ? AND folder = ?').run('General', userId, name);
    return this.getFolders(userId);
  },

  // 6. Reminders
  getReminders(userId = DEFAULT_USER_ID) {
    const rows = sqliteDb.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY due_at ASC').all(userId);
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      dueAt: r.due_at,
      priority: r.priority,
      status: r.status,
      category: r.category,
      notified: Boolean(r.notified),
      createdAt: r.created_at
    }));
  },

  createReminder(userId = DEFAULT_USER_ID, data = {}) {
    const id = data.id || `rem-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    sqliteDb.prepare(`
      INSERT INTO reminders (id, user_id, title, due_at, priority, status, category, notified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.title || 'Reminder',
      data.dueAt || now,
      data.priority || 'normal',
      data.status || 'pending',
      data.category || 'General',
      data.notified ? 1 : 0,
      now
    );
    return { id, userId, ...data, createdAt: now };
  },

  updateReminder(userId = DEFAULT_USER_ID, id, data = {}) {
    const existing = sqliteDb.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) return null;

    const updated = {
      title: data.title !== undefined ? data.title : existing.title,
      due_at: data.dueAt !== undefined ? data.dueAt : existing.due_at,
      priority: data.priority !== undefined ? data.priority : existing.priority,
      status: data.status !== undefined ? data.status : existing.status,
      category: data.category !== undefined ? data.category : existing.category,
      notified: data.notified !== undefined ? (data.notified ? 1 : 0) : existing.notified
    };

    sqliteDb.prepare(`
      UPDATE reminders SET title = ?, due_at = ?, priority = ?, status = ?, category = ?, notified = ?
      WHERE id = ? AND user_id = ?
    `).run(updated.title, updated.due_at, updated.priority, updated.status, updated.category, updated.notified, id, userId);

    return {
      id,
      title: updated.title,
      dueAt: updated.due_at,
      priority: updated.priority,
      status: updated.status,
      category: updated.category,
      notified: Boolean(updated.notified),
      createdAt: existing.created_at
    };
  },

  deleteReminder(userId = DEFAULT_USER_ID, id) {
    sqliteDb.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(id, userId);
    return true;
  },

  // 7. Settings & Quiet Hours
  getSettings(userId = DEFAULT_USER_ID) {
    const row = sqliteDb.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
    if (!row) return null;

    return {
      hasApiKey: Boolean(row.gemini_api_key),
      geminiApiKey: row.gemini_api_key,
      model: row.model,
      languagePreference: row.language_preference,
      soundEnabled: Boolean(row.sound_enabled),
      useWebSearch: Boolean(row.use_web_search),
      voiceEnabled: Boolean(row.voice_enabled),
      voiceAutoRead: Boolean(row.voice_auto_read),
      handsFreeMode: Boolean(row.hands_free_mode),
      quietHoursEnabled: Boolean(row.quiet_hours_enabled),
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
      updatedAt: row.updated_at
    };
  },

  updateSettings(userId = DEFAULT_USER_ID, data = {}) {
    const current = this.getSettings(userId) || {};
    const now = new Date().toISOString();

    let apiKey = current.geminiApiKey || '';
    if (data.geminiApiKey !== undefined) {
      apiKey = data.geminiApiKey === 'CLEAR' ? '' : data.geminiApiKey;
    }

    const updated = {
      gemini_api_key: apiKey,
      model: data.model || current.model || 'gemini-2.0-flash',
      language_preference: data.languagePreference || current.languagePreference || 'auto',
      sound_enabled: data.soundEnabled !== undefined ? (data.soundEnabled ? 1 : 0) : (current.soundEnabled ? 1 : 0),
      use_web_search: data.useWebSearch !== undefined ? (data.useWebSearch ? 1 : 0) : (current.useWebSearch ? 1 : 0),
      voice_enabled: data.voiceEnabled !== undefined ? (data.voiceEnabled ? 1 : 0) : (current.voiceEnabled ? 1 : 0),
      voice_auto_read: data.voiceAutoRead !== undefined ? (data.voiceAutoRead ? 1 : 0) : (current.voiceAutoRead ? 1 : 0),
      hands_free_mode: data.handsFreeMode !== undefined ? (data.handsFreeMode ? 1 : 0) : (current.handsFreeMode ? 1 : 0),
      quiet_hours_enabled: data.quietHoursEnabled !== undefined ? (data.quietHoursEnabled ? 1 : 0) : (current.quietHoursEnabled ? 1 : 0),
      quiet_hours_start: data.quietHoursStart || current.quietHoursStart || '22:00',
      quiet_hours_end: data.quietHoursEnd || current.quietHoursEnd || '07:00'
    };

    sqliteDb.prepare(`
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
    `).run(
      userId,
      updated.gemini_api_key,
      updated.model,
      updated.language_preference,
      updated.sound_enabled,
      updated.use_web_search,
      updated.voice_enabled,
      updated.voice_auto_read,
      updated.hands_free_mode,
      updated.quiet_hours_enabled,
      updated.quiet_hours_start,
      updated.quiet_hours_end,
      now
    );

    return this.getSettings(userId);
  },

  isQuietHours(userId = DEFAULT_USER_ID) {
    const s = this.getSettings(userId);
    if (!s || !s.quietHoursEnabled) return false;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = (s.quietHoursStart || '22:00').split(':').map(Number);
    const [eh, em] = (s.quietHoursEnd || '07:00').split(':').map(Number);
    const startMins = sh * 60 + (sm || 0);
    const endMins = eh * 60 + (em || 0);

    if (startMins > endMins) {
      // Overnight (e.g. 22:00 to 07:00)
      return currentMins >= startMins || currentMins <= endMins;
    } else {
      return currentMins >= startMins && currentMins <= endMins;
    }
  },

  // 8. Wellness, Medicines, and Encrypted Mood Journal
  getTodayWellness(userId = DEFAULT_USER_ID) {
    const todayStr = new Date().toISOString().split('T')[0];
    const stmt = sqliteDb.prepare('SELECT * FROM wellness WHERE user_id = ? AND date = ?');
    let row = stmt.get(userId, todayStr);

    if (!row) {
      // Find yesterday to calculate streak
      const last = sqliteDb.prepare('SELECT * FROM wellness WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(userId);
      const updatedStreak = last ? (last.water_glasses >= 5 ? last.streak_days + 1 : Math.max(1, last.streak_days)) : 1;

      sqliteDb.prepare(`
        INSERT INTO wellness (user_id, date, water_glasses, target_water, meals_json, work_minutes, breaks_taken, last_break_at, mood_rating, mood_label, mood_note, streak_days, consistency_score, settings_json, check_in_logs_json)
        VALUES (?, ?, 0, 8, '{}', 0, 0, NULL, 'calm', 'Calm', '', ?, 90, '{}', '[]')
      `).run(userId, todayStr, updatedStreak);

      row = stmt.get(userId, todayStr);
    }

    return {
      date: row.date,
      waterGlasses: row.water_glasses,
      targetWaterGlasses: row.target_water,
      meals: JSON.parse(row.meals_json || '{}'),
      workMinutes: row.work_minutes,
      breaksTaken: row.breaks_taken,
      lastBreakAt: row.last_break_at,
      mood: {
        rating: row.mood_rating,
        label: row.mood_label,
        note: row.mood_note
      },
      streakDays: row.streak_days,
      consistencyScore: row.consistency_score,
      settings: JSON.parse(row.settings_json || '{}'),
      checkInLogs: JSON.parse(row.check_in_logs_json || '[]')
    };
  },

  logWater(userId = DEFAULT_USER_ID, delta = 1) {
    const current = this.getTodayWellness(userId);
    const newCount = Math.max(0, current.waterGlasses + delta);

    sqliteDb.prepare('UPDATE wellness SET water_glasses = ? WHERE user_id = ? AND date = ?')
      .run(newCount, userId, current.date);

    return this.getTodayWellness(userId);
  },

  logMeal(userId = DEFAULT_USER_ID, mealKey, details = {}) {
    const current = this.getTodayWellness(userId);
    const meals = { ...current.meals };
    meals[mealKey] = {
      logged: true,
      time: details.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: details.note || ''
    };

    sqliteDb.prepare('UPDATE wellness SET meals_json = ? WHERE user_id = ? AND date = ?')
      .run(JSON.stringify(meals), userId, current.date);

    return this.getTodayWellness(userId);
  },

  logBreak(userId = DEFAULT_USER_ID) {
    const current = this.getTodayWellness(userId);
    const now = new Date().toISOString();
    sqliteDb.prepare('UPDATE wellness SET breaks_taken = breaks_taken + 1, last_break_at = ? WHERE user_id = ? AND date = ?')
      .run(now, userId, current.date);
    return this.getTodayWellness(userId);
  },

  logMood(userId = DEFAULT_USER_ID, rating, note = '') {
    const current = this.getTodayWellness(userId);
    const moodLabels = {
      energized: 'Energized & Motivated',
      calm: 'Calm & Centered',
      focused: 'Deeply Focused',
      fatigued: 'A bit Tired / Needs Rest',
      stressed: 'Need a Pause'
    };
    sqliteDb.prepare(`
      UPDATE wellness SET mood_rating = ?, mood_label = ?, mood_note = ?
      WHERE user_id = ? AND date = ?
    `).run(rating, moodLabels[rating] || rating, note, userId, current.date);

    return this.getTodayWellness(userId);
  },

  // Medicines
  getMedicines(userId = DEFAULT_USER_ID) {
    const rows = sqliteDb.prepare('SELECT * FROM medicines WHERE user_id = ? ORDER BY time ASC').all(userId);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      dosage: r.dosage,
      time: r.time,
      category: r.category,
      takenToday: Boolean(r.taken_today),
      lastTakenAt: r.last_taken_at,
      createdAt: r.created_at
    }));
  },

  addMedicine(userId = DEFAULT_USER_ID, data) {
    const id = `med-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    sqliteDb.prepare(`
      INSERT INTO medicines (id, user_id, name, dosage, time, category, taken_today, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, userId, data.name, data.dosage || '', data.time || '09:00', data.category || 'prescription', now);

    return { id, userId, ...data, takenToday: false, createdAt: now };
  },

  toggleMedicine(userId = DEFAULT_USER_ID, id) {
    const med = sqliteDb.prepare('SELECT * FROM medicines WHERE id = ? AND user_id = ?').get(id, userId);
    if (!med) return null;

    const newStatus = med.taken_today ? 0 : 1;
    const now = newStatus ? new Date().toISOString() : null;
    sqliteDb.prepare('UPDATE medicines SET taken_today = ?, last_taken_at = ? WHERE id = ? AND user_id = ?')
      .run(newStatus, now, id, userId);

    return { ...med, takenToday: Boolean(newStatus), lastTakenAt: now };
  },

  deleteMedicine(userId = DEFAULT_USER_ID, id) {
    sqliteDb.prepare('DELETE FROM medicines WHERE id = ? AND user_id = ?').run(id, userId);
    return true;
  },

  // Encrypted Mood Journal (AES-256-GCM at rest)
  getMoodJournal(userId = DEFAULT_USER_ID) {
    const rows = sqliteDb.prepare('SELECT * FROM mood_journal WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    return rows.map(r => {
      const decrypted = decryptHealthData(r.encrypted_payload);
      return {
        id: r.id,
        rating: r.rating,
        tags: JSON.parse(r.tags || '[]'),
        note: decrypted ? (decrypted.note || decrypted) : 'Encrypted entry',
        createdAt: r.created_at
      };
    });
  },

  addMoodJournalEntry(userId = DEFAULT_USER_ID, { rating, note, tags = [] }) {
    const id = `mood-${crypto.randomUUID()}`;
    const encrypted_payload = encryptHealthData({ note });
    const now = new Date().toISOString();

    sqliteDb.prepare(`
      INSERT INTO mood_journal (id, user_id, rating, tags, encrypted_payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, rating, JSON.stringify(tags), encrypted_payload, now);

    return { id, rating, tags, note, createdAt: now };
  },

  // Health Consent
  getHealthConsent(userId = DEFAULT_USER_ID) {
    const row = sqliteDb.prepare('SELECT * FROM health_consent WHERE user_id = ?').get(userId);
    return row ? { consentGiven: Boolean(row.consent_given), country: row.country, consentTimestamp: row.consent_timestamp } : { consentGiven: false, country: 'IN' };
  },

  updateHealthConsent(userId = DEFAULT_USER_ID, { consentGiven, country = 'IN' }) {
    const now = new Date().toISOString();
    sqliteDb.prepare(`
      INSERT INTO health_consent (user_id, consent_given, country, consent_timestamp)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        consent_given = excluded.consent_given,
        country = excluded.country,
        consent_timestamp = excluded.consent_timestamp
    `).run(userId, consentGiven ? 1 : 0, country, now);

    return { consentGiven: Boolean(consentGiven), country, consentTimestamp: now };
  },

  // Data Export (Portability)
  exportAllHealthData(userId = DEFAULT_USER_ID) {
    const wellness = this.getTodayWellness(userId);
    const medicines = this.getMedicines(userId);
    const moodJournal = this.getMoodJournal(userId);
    const consent = this.getHealthConsent(userId);

    return {
      exportedAt: new Date().toISOString(),
      standard: 'India DPDP Act 2023 & GDPR Data Portability',
      wellnessSummary: wellness,
      medicines,
      moodJournal,
      consent
    };
  },

  // Data Erasure (Right to Erasure)
  deleteAllHealthData(userId = DEFAULT_USER_ID) {
    sqliteDb.prepare('DELETE FROM medicines WHERE user_id = ?').run(userId);
    sqliteDb.prepare('DELETE FROM mood_journal WHERE user_id = ?').run(userId);
    sqliteDb.prepare('DELETE FROM wellness WHERE user_id = ?').run(userId);
    sqliteDb.prepare('DELETE FROM health_consent WHERE user_id = ?').run(userId);

    return { success: true, message: 'All personal health records erased successfully under DPDP Act / GDPR.' };
  }
};
