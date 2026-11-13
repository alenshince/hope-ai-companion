/**
 * API client for Hope AI Companion
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const res = await fetch(url, config);
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.error || errJson.details || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Chat & Research
  sendChatMessage(message, mode = 'research', history = []) {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, mode, history })
    });
  },

  // Notes
  getNotes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/notes${query ? `?${query}` : ''}`);
  },
  getNote(id) {
    return request(`/notes/${id}`);
  },
  createNote(data) {
    return request('/notes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateNote(id, data) {
    return request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteNote(id) {
    return request(`/notes/${id}`, {
      method: 'DELETE'
    });
  },
  cleanupNote(content) {
    return request('/notes/ai/cleanup', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },
  summarizeNote(content) {
    return request('/notes/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },
  extractTags(content) {
    return request('/notes/ai/tags', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  // Folders
  getFolders() {
    return request('/notes/folders/list');
  },
  createFolder(name) {
    return request('/notes/folders/create', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },
  deleteFolder(name) {
    return request(`/notes/folders/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
  },

  // Reminders
  getReminders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/reminders${query ? `?${query}` : ''}`);
  },
  createReminder(data) {
    return request('/reminders', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  parseReminder(input, autoCreate = true) {
    return request('/reminders/parse', {
      method: 'POST',
      body: JSON.stringify({ input, autoCreate })
    });
  },
  updateReminder(id, data) {
    return request(`/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  snoozeReminder(id, minutes = 15) {
    return request(`/reminders/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ minutes })
    });
  },
  markReminderNotified(id) {
    return request(`/reminders/${id}/notified`, {
      method: 'POST'
    });
  },
  deleteReminder(id) {
    return request(`/reminders/${id}`, {
      method: 'DELETE'
    });
  },

  // Settings
  getSettings() {
    return request('/settings');
  },
  updateSettings(data) {
    return request('/settings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  // Voice Assistant
  sendVoiceCommand(transcript) {
    return request('/chat/voice-command', {
      method: 'POST',
      body: JSON.stringify({ transcript })
    });
  },

  // Profile & Memory Core ("About Me")
  getProfile() {
    return request('/profile');
  },
  updateProfile(data) {
    return request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  getMemories(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/profile/memories${query ? `?${query}` : ''}`);
  },
  createMemory(data) {
    return request('/profile/memories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateMemory(id, data) {
    return request(`/profile/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteMemory(id) {
    return request(`/profile/memories/${id}`, {
      method: 'DELETE'
    });
  },
  getAIContext() {
    return request('/profile/context');
  },

  // Health & Lifestyle Guardian
  getTodayWellness() {
    return request('/wellness/today');
  },
  logWater(delta = 1) {
    return request('/wellness/water', {
      method: 'POST',
      body: JSON.stringify({ delta })
    });
  },
  logMeal(meal, note = '', time = null) {
    return request('/wellness/meal', {
      method: 'POST',
      body: JSON.stringify({ meal, note, time })
    });
  },
  logBreak() {
    return request('/wellness/break', {
      method: 'POST'
    });
  },
  logMood(rating, note = '') {
    return request('/wellness/mood', {
      method: 'POST',
      body: JSON.stringify({ rating, note })
    });
  },
  checkProactiveWellness() {
    return request('/wellness/check-in');
  },
  updateWellnessSettings(settings) {
    return request('/wellness/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },
  getWellnessHistory() {
    return request('/wellness/history');
  },

  // Health Check
  checkHealth() {
    return request('/health');
  }
};

