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
  sendChatMessage(message, mode = 'research', history = [], languagePreference = 'auto') {
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, mode, history, languagePreference })
    });
  },

  async streamChatMessage({ message, history = [], languagePreference = 'auto', onStatus, onDelta, onDone, onError }) {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, languagePreference })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'status' && onStatus) onStatus(data.message);
              else if (currentEvent === 'delta' && onDelta) onDelta(data.text);
              else if (currentEvent === 'done' && onDone) onDone(data);
              else if (currentEvent === 'error' && onError) onError(new Error(data.error));
            } catch {}
          }
        }
      }
    } catch (err) {
      if (onError) onError(err);
      else throw err;
    }
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
  validateProfileUrl(url) {
    return request('/profile/validate-url', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  },
  syncGitHub(githubUrl, consent = true) {
    return request('/profile/sync-github', {
      method: 'POST',
      body: JSON.stringify({ githubUrl, consent })
    });
  },
  savePastedProfileData(platform, content) {
    return request('/profile/pasted-data', {
      method: 'POST',
      body: JSON.stringify({ platform, content })
    });
  },
  clearExternalProfileData() {
    return request('/profile/external-data', {
      method: 'DELETE'
    });
  },
  getContextProfile() {
    return request('/profile/context-profile');
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
  getMedicines() {
    return request('/wellness/medicines');
  },
  addMedicine(data) {
    return request('/wellness/medicines', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  toggleMedicine(id) {
    return request(`/wellness/medicines/${id}/toggle`, {
      method: 'POST'
    });
  },
  deleteMedicine(id) {
    return request(`/wellness/medicines/${id}`, {
      method: 'DELETE'
    });
  },
  getMoodJournal() {
    return request('/wellness/mood-journal');
  },
  addMoodJournalEntry(data) {
    return request('/wellness/mood-journal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getHealthConsent() {
    return request('/wellness/consent');
  },
  updateHealthConsent(data) {
    return request('/wellness/consent', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  exportHealthData() {
    return request('/wellness/export');
  },
  deleteAllHealthData() {
    return request('/wellness/delete-all', {
      method: 'DELETE'
    });
  },

  // Health Check
  checkHealth() {
    return request('/health');
  }
};

