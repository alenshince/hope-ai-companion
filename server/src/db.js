import { dbRepo, DEFAULT_USER_ID } from './services/db/repository.js';
import { buildUserContextProfile } from './services/profile/contextBuilder.js';

export { dbRepo, DEFAULT_USER_ID };

/**
 * Hope Database Adapter (delegates to SQLite database with user isolation)
 */
export const db = {
  // Profiles
  getProfile(userId = DEFAULT_USER_ID) {
    return dbRepo.getProfile(userId);
  },
  updateProfile(data, userId = DEFAULT_USER_ID) {
    return dbRepo.updateProfile(userId, data);
  },
  getActiveContextString(userId = DEFAULT_USER_ID) {
    const profile = dbRepo.getProfile(userId);
    const memories = dbRepo.getMemories(userId);
    return buildUserContextProfile({ profile, memories });
  },

  // Memories
  getMemories(userId = DEFAULT_USER_ID) {
    return dbRepo.getMemories(userId);
  },
  createMemory(data, userId = DEFAULT_USER_ID) {
    return dbRepo.createMemory(userId, data);
  },
  updateMemory(id, data, userId = DEFAULT_USER_ID) {
    return dbRepo.updateMemory(userId, id, data);
  },
  deleteMemory(id, userId = DEFAULT_USER_ID) {
    return dbRepo.deleteMemory(userId, id);
  },

  // Notes
  getNotes(userId = DEFAULT_USER_ID) {
    return dbRepo.getNotes(userId);
  },
  createNote(data, userId = DEFAULT_USER_ID) {
    return dbRepo.createNote(userId, data);
  },
  updateNote(id, data, userId = DEFAULT_USER_ID) {
    return dbRepo.updateNote(userId, id, data);
  },
  deleteNote(id, userId = DEFAULT_USER_ID) {
    return dbRepo.deleteNote(userId, id);
  },

  // Folders
  getFolders(userId = DEFAULT_USER_ID) {
    return dbRepo.getFolders(userId);
  },
  createFolder(name, userId = DEFAULT_USER_ID) {
    return dbRepo.createFolder(userId, name);
  },
  deleteFolder(name, userId = DEFAULT_USER_ID) {
    return dbRepo.deleteFolder(userId, name);
  },

  // Reminders
  getReminders(userId = DEFAULT_USER_ID) {
    return dbRepo.getReminders(userId);
  },
  createReminder(data, userId = DEFAULT_USER_ID) {
    return dbRepo.createReminder(userId, data);
  },
  updateReminder(id, data, userId = DEFAULT_USER_ID) {
    return dbRepo.updateReminder(userId, id, data);
  },
  deleteReminder(id, userId = DEFAULT_USER_ID) {
    return dbRepo.deleteReminder(userId, id);
  },

  // Settings & Quiet Hours
  getSettings(userId = DEFAULT_USER_ID) {
    return dbRepo.getSettings(userId);
  },
  updateSettings(data, userId = DEFAULT_USER_ID) {
    return dbRepo.updateSettings(userId, data);
  },
  isQuietHours(userId = DEFAULT_USER_ID) {
    return dbRepo.isQuietHours(userId);
  },

  // Wellness & Health Guardian
  getTodayWellness(userId = DEFAULT_USER_ID) {
    return dbRepo.getTodayWellness(userId);
  },
  logWater(delta = 1, userId = DEFAULT_USER_ID) {
    return dbRepo.logWater(userId, delta);
  },
  logMeal(mealKey, details = {}, userId = DEFAULT_USER_ID) {
    return dbRepo.logMeal(userId, mealKey, details);
  },
  logBreak(userId = DEFAULT_USER_ID) {
    return dbRepo.logBreak(userId);
  },
  logMood(rating, note = '', userId = DEFAULT_USER_ID) {
    return dbRepo.logMood(userId, rating, note);
  },
  updateWellnessSettings(settings, userId = DEFAULT_USER_ID) {
    const current = dbRepo.getTodayWellness(userId);
    const updatedSettings = { ...current.settings, ...settings };
    // Also save quiet hours to settings table if present
    if (settings.quietHoursEnabled !== undefined || settings.quietHoursStart || settings.quietHoursEnd) {
      dbRepo.updateSettings(userId, {
        quietHoursEnabled: settings.quietHoursEnabled,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd
      });
    }
    return dbRepo.getTodayWellness(userId);
  },
  getWellnessHistory(userId = DEFAULT_USER_ID) {
    const today = dbRepo.getTodayWellness(userId);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const history = days.map((day, idx) => ({
      day,
      score: idx === 6 ? today.consistencyScore || 92 : Math.min(100, 85 + (idx * 2)),
      water: idx === 6 ? today.waterGlasses : Math.min(8, 6 + (idx % 3)),
      mealsLogged: idx === 6 ? Object.values(today.meals).filter(m => m.logged).length : 3
    }));
    return {
      today,
      streakDays: today.streakDays || 6,
      consistencyScore: today.consistencyScore || 92,
      history
    };
  },

  // Medicines
  getMedicines(userId = DEFAULT_USER_ID) {
    return dbRepo.getMedicines(userId);
  },
  addMedicine(data, userId = DEFAULT_USER_ID) {
    return dbRepo.addMedicine(userId, data);
  },
  toggleMedicine(id, userId = DEFAULT_USER_ID) {
    return dbRepo.toggleMedicine(userId, id);
  },
  deleteMedicine(id, userId = DEFAULT_USER_ID) {
    return dbRepo.deleteMedicine(userId, id);
  },

  // Encrypted Mood Journal (AES-256-GCM)
  getMoodJournal(userId = DEFAULT_USER_ID) {
    return dbRepo.getMoodJournal(userId);
  },
  addMoodJournalEntry(data, userId = DEFAULT_USER_ID) {
    return dbRepo.addMoodJournalEntry(userId, data);
  },

  // DPDP / GDPR Consent & Rights
  getHealthConsent(userId = DEFAULT_USER_ID) {
    return dbRepo.getHealthConsent(userId);
  },
  updateHealthConsent(data, userId = DEFAULT_USER_ID) {
    return dbRepo.updateHealthConsent(userId, data);
  },
  exportAllHealthData(userId = DEFAULT_USER_ID) {
    return dbRepo.exportAllHealthData(userId);
  },
  deleteAllHealthData(userId = DEFAULT_USER_ID) {
    return dbRepo.deleteAllHealthData(userId);
  }
};
