import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const WELLNESS_FILE = path.join(DATA_DIR, 'wellness.json');

function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Default Seed Data
const DEFAULT_FOLDERS = [
  'Research',
  'Projects',
  'Ideas',
  'Daily Notes',
  'Quick Thoughts'
];

const DEFAULT_NOTES = [
  {
    id: 'note-welcome-01',
    title: 'Welcome to Hope – Your Calming AI Companion',
    folder: 'Daily Notes',
    tags: ['welcome', 'guide', 'ai-companion'],
    isPinned: true,
    content: `# Welcome to Hope 🌿

Hello! I am **Hope**, your personal AI companion designed to help you synthesize deep research, organize clear thoughts, and stay seamlessly on top of your day.

---

### What We Can Do Together

1. **In-Depth Research Assistant**
   - Ask complex questions in the **Research** tab.
   - I will browse and scrape real-time information, synthesize findings with structured summaries, and cite authentic sources with clickable links.
   - Click the **"One-Click to Notes"** button below any research answer to immediately archive it into your notebooks.

2. **Smart Note-Taking & Brain Dumps**
   - Write cleanly in Markdown with syntax highlighting and rich lists.
   - Use the **✨ AI Clean Up** button to let me transform messy bullet points into polished, executive-ready prose.
   - Use **🏷️ Auto-Tags** to extract relevant concepts automatically.

3. **Natural Language Reminders**
   - Type naturally in the Reminders bar:
     > *"Remind me to review research on quantum computing tomorrow at 5 PM"*
     > *"Call Sarah in 2 hours"*
   - I will parse the exact time, priority, and topic without you fiddling with dropdown pickers!

---

*Take a deep breath. Let's build something wonderful today.*`,
    summary: 'A welcoming overview detailing Hope\'s three pillars: deep web research, smart markdown note-taking with AI clean up, and natural language reminder management.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'note-quantum-02',
    title: 'Quantum Computing Horizons: Fault-Tolerant Architectures (2026)',
    folder: 'Research',
    tags: ['research', 'quantum', 'physics', 'deep-tech'],
    isPinned: false,
    content: `# Quantum Computing Horizons: Fault-Tolerant Architectures

## Executive Summary
Recent developments in quantum error correction (QEC) have moved the industry from noisy intermediate-scale quantum (NISQ) systems toward early logical qubit architectures. Key breakthroughs center on neutral atom arrays and superconducting surface codes.

## Key Insights
- **Logical Qubit Scaling**: Demonstration of 100+ error-corrected logical qubits operating with below-threshold physical error rates.
- **Topological & Surface Codes**: Reduced overhead in lattice surgery allows complex quantum algorithms to run with high fidelity.
- **Neutral Atom Momentum**: Laser-trapped neutral atom platforms offer all-to-all connectivity with reconfigurable optical tweezers.

## Research Citations & References
- [[1] Nature Quantum: Advances in Fault-Tolerant Logical Qubits](https://www.nature.com)
- [[2] MIT Technology Review: The Commercial Race for Error-Free Quantum Computing](https://www.technologyreview.com)
- [[3] Quanta Magazine: Inside Neutral Atom Quantum Processors](https://www.quantamagazine.org)

*Synthesized with Hope AI Research Assistant*`,
    summary: 'Overview of modern fault-tolerant quantum computing advances, emphasizing neutral atom arrays, surface codes, and logical qubit scaling.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
tomorrow.setHours(17, 0, 0, 0);

const laterToday = new Date(now.getTime() + 3 * 60 * 60 * 1000);

const DEFAULT_REMINDERS = [
  {
    id: 'rem-01',
    title: 'Review research on quantum computing',
    dueAt: tomorrow.toISOString(),
    priority: 'high',
    status: 'pending',
    category: 'Research',
    notified: false,
    createdAt: now.toISOString()
  },
  {
    id: 'rem-02',
    title: 'Organize new research notes into project folder',
    dueAt: laterToday.toISOString(),
    priority: 'normal',
    status: 'pending',
    category: 'Organization',
    notified: false,
    createdAt: now.toISOString()
  },
  {
    id: 'rem-03',
    title: 'Drink a glass of water and stretch',
    dueAt: new Date(now.getTime() - 3600000).toISOString(),
    priority: 'low',
    status: 'completed',
    category: 'Wellness',
    notified: true,
    createdAt: new Date(now.getTime() - 7200000).toISOString()
  }
];

const DEFAULT_SETTINGS = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  model: 'gemini-2.0-flash',
  useWebSearch: true,
  soundEnabled: true,
  notificationsEnabled: true,
  voiceEnabled: true,
  voiceAutoRead: true,
  handsFreeMode: false
};

export const DEFAULT_PROFILE = {
  id: 'user-alen-shince',
  name: 'Alen Shince',
  title: 'S5 CSE Student • Creative Developer • UI/UX Designer',
  institution: 'Mar Baselios Christian College of Engineering and Technology (MBCCET), Peermade',
  branch: 'Computer Science & Engineering',
  semester: 'Semester 5 (S5)',
  bio: 'S5 CSE student at MBCCET with a passion for human-centered digital experiences, blending creative direction with full-stack and mobile craftsmanship. Leading creative initiatives and major hackathons at HIVE.',
  techStack: [
    { category: 'Design & Prototyping', items: ['Figma', 'UI/UX Design', 'Graphic Design', 'Design Systems', 'Wireframing'] },
    { category: 'Mobile & Frontend', items: ['Flutter', 'Dart', 'React.js', 'Tailwind CSS', 'Progressive Web Apps (PWA)'] },
    { category: 'Backend & Systems', items: ['Python', 'Java', 'Node.js', 'REST APIs', 'Firebase'] },
    { category: 'DevOps & Tools', items: ['Git', 'GitHub', 'VS Code', 'Android Studio', 'Vite'] }
  ],
  leadership: [
    {
      role: 'Creative Team Lead & Event Coordinator',
      organization: 'HIVE (MBCCET CSE Department / Technical Club)',
      period: '2025 - Present',
      description: 'Heads creative direction, visual branding, stage design, and technical logistics for all flagship college events.',
      highlights: [
        'Coordinated "Hack Till Dawn" — a marquee 24-hour overnight hackathon bringing together student innovators.',
        'Organized the internal collegiate rounds for Smart India Hackathon (SIH), mentoring participating teams.',
        'Spearheaded hands-on workshops in UI/UX design, Figma workflows, and mobile application fundamentals.'
      ]
    }
  ],
  projects: [
    {
      id: 'proj-nerreksha',
      name: 'NerReksha',
      tagline: 'Offline-First Disaster Resilience & Emergency PWA',
      category: 'PWA / Emergency Tech',
      description: 'An offline-first progressive web application engineered for critical crisis coordination, disaster resilience, peer emergency beacons, and offline emergency guidance when connectivity fails.',
      tech: ['PWA', 'JavaScript', 'IndexedDB', 'Service Workers', 'UI/UX'],
      links: { github: 'https://github.com/alenshince' },
      status: 'Active'
    },
    {
      id: 'proj-rock',
      name: 'Rock',
      tagline: 'Voice-Enabled Personal AI Companion',
      category: 'AI / Voice Assistant',
      description: 'An intelligent voice-interactive personal assistant delivering hands-free conversational computing, rapid query handling, and multimodal automation.',
      tech: ['Python', 'Speech Recognition', 'NLP', 'TTS', 'REST APIs'],
      links: { github: 'https://github.com/alenshince' },
      status: 'Active'
    },
    {
      id: 'proj-hive-design',
      name: 'HIVE Visual Identity & Hackathon Portals',
      tagline: 'Comprehensive Event Branding, Portals & Design Systems',
      category: 'UI/UX & Graphic Design',
      description: 'Design architecture and interactive web portals for Hack Till Dawn and SIH collegiate showcases, establishing high-aesthetic standards for tech events.',
      tech: ['Figma', 'Graphic Design', 'React', 'Tailwind CSS'],
      links: { github: 'https://github.com/alenshince' },
      status: 'Active'
    }
  ],
  links: {
    github: 'https://github.com/alenshince',
    linkedin: 'https://linkedin.com/in/alenshince',
    portfolio: 'https://github.com/alenshince'
  },
  preferences: {
    theme: 'calm-light',
    tone: 'intellectual, warm, encouraging, and clear',
    primaryLanguages: ['Flutter/Dart', 'Python', 'Java', 'JavaScript'],
    designTool: 'Figma'
  },
  updatedAt: new Date().toISOString()
};

export const DEFAULT_MEMORIES = [
  {
    id: 'mem-01',
    category: 'identity',
    title: 'Academic Background',
    content: 'Alen Shince is currently in Semester 5 (S5) pursuing Computer Science & Engineering at Mar Baselios Christian College of Engineering and Technology (MBCCET), Peermade.',
    tags: ['education', 'mbccet', 's5-cse', 'alen-shince'],
    importance: 'critical',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem-02',
    category: 'tech_stack',
    title: 'Core Technical Expertise',
    content: 'Alen specializes in Figma, Flutter, Java, Python, UI/UX design, and graphic design. He bridges creative aesthetics with robust software engineering.',
    tags: ['figma', 'flutter', 'java', 'python', 'ui-ux', 'graphic-design'],
    importance: 'critical',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem-03',
    category: 'leadership',
    title: 'HIVE Creative Lead & Hackathons',
    content: 'Alen serves as the Creative Team Lead & Event Coordinator at HIVE. He coordinated major collegiate events including the 24-hour "Hack Till Dawn" hackathon and SIH (Smart India Hackathon) internal rounds.',
    tags: ['hive', 'hack-till-dawn', 'sih', 'event-coordinator', 'leadership'],
    importance: 'critical',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem-04',
    category: 'projects',
    title: 'Project: NerReksha (Offline-first PWA)',
    content: 'NerReksha is an offline-first PWA designed for disaster resilience and offline emergency management. Built with service workers, local storage caching, and empathetic UI/UX for high-stress situations.',
    tags: ['nerreksha', 'pwa', 'offline-first', 'disaster-tech'],
    importance: 'high',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem-05',
    category: 'projects',
    title: 'Project: Rock (Voice AI Companion)',
    content: 'Rock is a voice-enabled personal AI companion created by Alen, implementing speech recognition, natural language interaction, and rapid hands-free tasks.',
    tags: ['rock', 'voice-assistant', 'ai-companion', 'python'],
    importance: 'high',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem-06',
    category: 'profiles',
    title: 'Professional Profiles & GitHub',
    content: 'Alen\'s official GitHub is https://github.com/alenshince and his LinkedIn profile reflects his work across creative design, Flutter engineering, and Python systems.',
    tags: ['github', 'linkedin', 'links'],
    importance: 'high',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'mem-07',
    category: 'design',
    title: 'UI/UX & Aesthetic Philosophy',
    content: 'Alen champions minimalist, human-friendly interface design, purposeful typography, and seamless micro-interactions in all digital products.',
    tags: ['ui-ux', 'design-philosophy', 'figma'],
    importance: 'medium',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_WELLNESS = {
  date: new Date().toISOString().split('T')[0],
  waterGlasses: 5,
  targetWaterGlasses: 8,
  meals: {
    breakfast: { logged: true, time: '08:45 AM', note: 'Oatmeal, fruits & nuts' },
    lunch: { logged: true, time: '01:15 PM', note: 'Balanced meal & veggies' },
    dinner: { logged: false, time: null, note: '' }
  },
  workMinutes: 195,
  breaksTaken: 2,
  lastBreakAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  mood: {
    rating: 'focused',
    label: 'Focused & Energized',
    note: 'Developing advanced modules for Hope AI',
    loggedAt: new Date().toISOString()
  },
  streakDays: 6,
  consistencyScore: 92,
  settings: {
    mealRemindersEnabled: true,
    hydrationRemindersEnabled: true,
    lateNightWarningEnabled: true,
    breakRemindersEnabled: true,
    targetWaterGlasses: 8,
    lunchStart: '12:30',
    lunchEnd: '14:30',
    dinnerStart: '19:30',
    dinnerEnd: '21:30',
    lateNightStart: '22:30'
  },
  checkInLogs: [
    {
      id: 'check-01',
      type: 'hydration',
      message: 'Hydration check: You had 5 glasses so far. 3 more to reach your daily goal.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ]
};

export const db = {
  // Notes
  getNotes() {
    return readJsonFile(NOTES_FILE, DEFAULT_NOTES);
  },
  getNote(id) {
    const notes = this.getNotes();
    return notes.find(n => n.id === id);
  },
  createNote(data) {
    const notes = this.getNotes();
    const newNote = {
      id: data.id || `note-${crypto.randomUUID()}`,
      title: data.title || 'Untitled Note',
      folder: data.folder || 'Research',
      tags: Array.isArray(data.tags) ? data.tags : [],
      isPinned: Boolean(data.isPinned),
      content: data.content || '',
      summary: data.summary || '',
      sources: data.sources || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.unshift(newNote);
    writeJsonFile(NOTES_FILE, notes);
    return newNote;
  },
  updateNote(id, data) {
    const notes = this.getNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    notes[idx] = {
      ...notes[idx],
      ...data,
      id, // keep immutable id
      updatedAt: new Date().toISOString()
    };
    writeJsonFile(NOTES_FILE, notes);
    return notes[idx];
  },
  deleteNote(id) {
    const notes = this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    writeJsonFile(NOTES_FILE, filtered);
    return true;
  },

  // Folders
  getFolders() {
    return readJsonFile(FOLDERS_FILE, DEFAULT_FOLDERS);
  },
  createFolder(name) {
    if (!name || typeof name !== 'string') return this.getFolders();
    const trimmed = name.trim();
    const folders = this.getFolders();
    if (!folders.includes(trimmed)) {
      folders.push(trimmed);
      writeJsonFile(FOLDERS_FILE, folders);
    }
    return folders;
  },
  deleteFolder(name) {
    const folders = this.getFolders().filter(f => f !== name);
    writeJsonFile(FOLDERS_FILE, folders);
    return folders;
  },

  // Reminders
  getReminders() {
    return readJsonFile(REMINDERS_FILE, DEFAULT_REMINDERS);
  },
  getReminder(id) {
    const reminders = this.getReminders();
    return reminders.find(r => r.id === id);
  },
  createReminder(data) {
    const reminders = this.getReminders();
    const newReminder = {
      id: data.id || `rem-${crypto.randomUUID()}`,
      title: data.title || 'New Reminder',
      dueAt: data.dueAt || new Date().toISOString(),
      priority: data.priority || 'normal', // low, normal, high, urgent
      status: data.status || 'pending', // pending, completed, dismissed
      category: data.category || 'General',
      notified: Boolean(data.notified),
      createdAt: new Date().toISOString()
    };
    reminders.unshift(newReminder);
    writeJsonFile(REMINDERS_FILE, reminders);
    return newReminder;
  },
  updateReminder(id, data) {
    const reminders = this.getReminders();
    const idx = reminders.findIndex(r => r.id === id);
    if (idx === -1) return null;
    reminders[idx] = {
      ...reminders[idx],
      ...data,
      id
    };
    writeJsonFile(REMINDERS_FILE, reminders);
    return reminders[idx];
  },
  deleteReminder(id) {
    const reminders = this.getReminders();
    const filtered = reminders.filter(r => r.id !== id);
    writeJsonFile(REMINDERS_FILE, filtered);
    return true;
  },

  // Settings
  getSettings() {
    return readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  },
  updateSettings(data) {
    const current = this.getSettings();
    const updated = { ...current, ...data };
    writeJsonFile(SETTINGS_FILE, updated);
    return updated;
  },

  // Profile (The "About Me" Core)
  getProfile() {
    return readJsonFile(PROFILE_FILE, DEFAULT_PROFILE);
  },
  updateProfile(data) {
    const current = this.getProfile();
    const updated = {
      ...current,
      ...data,
      id: current.id,
      updatedAt: new Date().toISOString()
    };
    writeJsonFile(PROFILE_FILE, updated);
    return updated;
  },

  // Memory Context Engine
  getMemories() {
    return readJsonFile(MEMORIES_FILE, DEFAULT_MEMORIES);
  },
  getMemory(id) {
    const memories = this.getMemories();
    return memories.find(m => m.id === id);
  },
  createMemory(data) {
    const memories = this.getMemories();
    const newMemory = {
      id: data.id || `mem-${crypto.randomUUID()}`,
      category: data.category || 'general',
      title: data.title || 'Personal Context Note',
      content: data.content || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      importance: data.importance || 'normal', // critical, high, medium, normal
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdAt: new Date().toISOString()
    };
    memories.unshift(newMemory);
    writeJsonFile(MEMORIES_FILE, memories);
    return newMemory;
  },
  updateMemory(id, data) {
    const memories = this.getMemories();
    const idx = memories.findIndex(m => m.id === id);
    if (idx === -1) return null;
    memories[idx] = {
      ...memories[idx],
      ...data,
      id
    };
    writeJsonFile(MEMORIES_FILE, memories);
    return memories[idx];
  },
  deleteMemory(id) {
    const memories = this.getMemories();
    const filtered = memories.filter(m => m.id !== id);
    writeJsonFile(MEMORIES_FILE, filtered);
    return true;
  },
  getActiveContextString() {
    const profile = this.getProfile();
    const memories = this.getMemories().filter(m => m.isActive);

    const memoryBullets = memories.map(m => `- [${m.category.toUpperCase()}] ${m.title}: ${m.content}`).join('\n');

    const projectSummary = (profile.projects || []).map(p => 
      `- ${p.name} (${p.category}): ${p.tagline}. Built with: ${p.tech.join(', ')}.`
    ).join('\n');

    return `### Primary User Context & Memory Engine:
- Name: ${profile.name}
- Title & Education: ${profile.title} (${profile.branch}, ${profile.semester}) at ${profile.institution}.
- Primary Stack: ${profile.techStack?.map(t => `${t.category}: ${t.items.join(', ')}`).join(' | ')}.
- Leadership: HIVE Creative Team Lead & Event Coordinator (Hack Till Dawn, SIH hackathons).
- Projects:
${projectSummary}
- Profiles: GitHub (${profile.links?.github}), LinkedIn (${profile.links?.linkedin}).

### Active Indexed Memories:
${memoryBullets}`;
  },

  // Health & Lifestyle Guardian
  getTodayWellness() {
    const todayStr = new Date().toISOString().split('T')[0];
    const wellnessData = readJsonFile(WELLNESS_FILE, DEFAULT_WELLNESS);
    // If date changed, rollover/reset daily counters while keeping settings and streak
    if (wellnessData.date !== todayStr) {
      const yesterday = wellnessData;
      const wasConsistent = yesterday.waterGlasses >= 5 && yesterday.meals.lunch?.logged;
      const updatedStreak = wasConsistent ? (yesterday.streakDays || 1) + 1 : Math.max(1, yesterday.streakDays || 1);
      
      const newDay = {
        date: todayStr,
        waterGlasses: 0,
        targetWaterGlasses: yesterday.settings?.targetWaterGlasses || 8,
        meals: {
          breakfast: { logged: false, time: null, note: '' },
          lunch: { logged: false, time: null, note: '' },
          dinner: { logged: false, time: null, note: '' }
        },
        workMinutes: 0,
        breaksTaken: 0,
        lastBreakAt: null,
        mood: { rating: 'calm', label: 'Calm', note: 'New day starting', loggedAt: new Date().toISOString() },
        streakDays: updatedStreak,
        consistencyScore: yesterday.consistencyScore || 90,
        settings: yesterday.settings || DEFAULT_WELLNESS.settings,
        checkInLogs: []
      };
      writeJsonFile(WELLNESS_FILE, newDay);
      return newDay;
    }
    return wellnessData;
  },
  updateWellness(data) {
    const current = this.getTodayWellness();
    const updated = { ...current, ...data };
    writeJsonFile(WELLNESS_FILE, updated);
    return updated;
  },
  logWater(delta = 1) {
    const current = this.getTodayWellness();
    const newCount = Math.max(0, (current.waterGlasses || 0) + delta);
    const updated = {
      ...current,
      waterGlasses: newCount,
      checkInLogs: [
        {
          id: `check-${Date.now()}`,
          type: 'water',
          message: delta > 0 ? `Logged ${delta} glass(es) of water (${newCount}/${current.targetWaterGlasses || 8})` : `Decreased water log to ${newCount}`,
          timestamp: new Date().toISOString()
        },
        ...(current.checkInLogs || []).slice(0, 19)
      ]
    };
    writeJsonFile(WELLNESS_FILE, updated);
    return updated;
  },
  logMeal(mealKey, details = {}) {
    const current = this.getTodayWellness();
    const meals = { ...current.meals };
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    meals[mealKey] = {
      logged: true,
      time: details.time || nowTimeStr,
      note: details.note || `${mealKey.charAt(0).toUpperCase() + mealKey.slice(1)} logged`
    };

    const updated = {
      ...current,
      meals,
      checkInLogs: [
        {
          id: `check-${Date.now()}`,
          type: 'meal',
          message: `Nourished: ${mealKey.charAt(0).toUpperCase() + mealKey.slice(1)} logged at ${nowTimeStr}`,
          timestamp: new Date().toISOString()
        },
        ...(current.checkInLogs || []).slice(0, 19)
      ]
    };
    writeJsonFile(WELLNESS_FILE, updated);
    return updated;
  },
  logBreak() {
    const current = this.getTodayWellness();
    const updated = {
      ...current,
      breaksTaken: (current.breaksTaken || 0) + 1,
      lastBreakAt: new Date().toISOString(),
      checkInLogs: [
        {
          id: `check-${Date.now()}`,
          type: 'break',
          message: 'Took a refreshing break to stretch and rest eyes (20-20-20 rule)',
          timestamp: new Date().toISOString()
        },
        ...(current.checkInLogs || []).slice(0, 19)
      ]
    };
    writeJsonFile(WELLNESS_FILE, updated);
    return updated;
  },
  logMood(rating, note = '') {
    const current = this.getTodayWellness();
    const moodLabels = {
      energized: 'Energized & Motivated',
      calm: 'Calm & Centered',
      focused: 'Deeply Focused',
      fatigued: 'A bit Tired / Needs Rest',
      stressed: 'Need a Pause'
    };
    const updated = {
      ...current,
      mood: {
        rating,
        label: moodLabels[rating] || rating,
        note,
        loggedAt: new Date().toISOString()
      }
    };
    writeJsonFile(WELLNESS_FILE, updated);
    return updated;
  },
  updateWellnessSettings(settingsData) {
    const current = this.getTodayWellness();
    const updated = {
      ...current,
      settings: {
        ...current.settings,
        ...settingsData
      }
    };
    writeJsonFile(WELLNESS_FILE, updated);
    return updated;
  },
  getWellnessHistory() {
    const today = this.getTodayWellness();
    // Return a structured 7-day routine trend
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
  }
};

