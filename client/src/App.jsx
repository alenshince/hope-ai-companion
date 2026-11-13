import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import ResearchChat from './components/ResearchAssistant/ResearchChat';
import NotesLayout from './components/SmartNotes/NotesLayout';
import RemindersDashboard from './components/Reminders/RemindersDashboard';
import SettingsModal from './components/Settings/SettingsModal';
import AboutMeDashboard from './components/AboutMe/AboutMeDashboard';
import HealthGuardianDashboard from './components/HealthGuardian/HealthGuardianDashboard';
import VoiceAssistantModal from './components/Voice/VoiceAssistantModal';
import { api } from './api';
import { playCalmChime } from './utils/audio';
import { sendBrowserNotification } from './utils/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState('research'); // 'research', 'about-me', 'health', 'notes', 'reminders', 'settings'
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState(['Research', 'Projects', 'Ideas', 'Daily Notes', 'Quick Thoughts']);
  const [reminders, setReminders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [activeMemoriesCount, setActiveMemoriesCount] = useState(7);
  const notifiedProactiveTriggersRef = useRef(new Set());

  // Toast notification helper
  const addToast = (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast = { id, ...toast };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initial Data Fetching
  const loadInitialData = async () => {
    try {
      const [fetchedNotes, fetchedFolders, fetchedReminders, fetchedSettings, profileData] = await Promise.all([
        api.getNotes(),
        api.getFolders(),
        api.getReminders(),
        api.getSettings(),
        api.getProfile().catch(() => ({ activeMemoriesCount: 7 }))
      ]);

      setNotes(fetchedNotes);
      setFolders(fetchedFolders);
      setReminders(fetchedReminders);
      setSettings(fetchedSettings);
      if (profileData?.activeMemoriesCount !== undefined) {
        setActiveMemoriesCount(profileData.activeMemoriesCount);
      }

      if (fetchedNotes.length > 0 && !selectedNoteId) {
        setSelectedNoteId(fetchedNotes[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Proactive Health Guardian Background Watcher
  // Periodically evaluates meal thresholds (dinner, lunch), late night work, and hydration
  useEffect(() => {
    const evaluateHealthGuardian = async () => {
      try {
        const res = await api.checkProactiveWellness();
        if (res && res.triggered) {
          const triggerKey = `${res.type}-${new Date().getHours()}`;
          if (!notifiedProactiveTriggersRef.current.has(triggerKey)) {
            notifiedProactiveTriggersRef.current.add(triggerKey);

            if (settingsRef.current?.soundEnabled ?? true) {
              playCalmChime();
            }

            sendBrowserNotification(res.title, { body: res.message });

            addToast({
              type: 'hope',
              title: res.title,
              message: res.message,
              action: {
                label: 'View Health Guardian →',
                onClick: () => setActiveTab('health')
              }
            });
          }
        }
      } catch (e) {
        console.warn('Health Guardian check error:', e);
      }
    };

    // Evaluate immediately on startup & every 25 seconds
    const timeout = setTimeout(evaluateHealthGuardian, 2000);
    const interval = setInterval(evaluateHealthGuardian, 25000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  // Background Reminder Notification Watcher
  // Runs every 6 seconds to check if any scheduled reminder is due
  const remindersRef = useRef(reminders);
  remindersRef.current = reminders;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const checkDueReminders = async () => {
      const currentReminders = remindersRef.current;
      const currentSettings = settingsRef.current;
      const now = new Date();

      for (const rem of currentReminders) {
        if (rem.status === 'pending' && !rem.notified) {
          const dueDate = new Date(rem.dueAt);
          // If due now or overdue within last 24 hours
          if (dueDate <= now && (now - dueDate) < 24 * 3600 * 1000) {
            // Trigger audio chime if sound enabled
            if (currentSettings?.soundEnabled ?? true) {
              playCalmChime();
            }

            // Trigger system browser notification
            sendBrowserNotification(`Reminder: ${rem.title}`, {
              body: `Scheduled for ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Category: ${rem.category || 'General'}`
            });

            // Trigger in-app toast
            addToast({
              type: 'hope',
              title: 'Reminder Due 🌿',
              message: rem.title,
              action: {
                label: 'Open Reminders →',
                onClick: () => setActiveTab('reminders')
              }
            });

            // Mark as notified in DB
            try {
              await api.markReminderNotified(rem.id);
              setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, notified: true } : r));
            } catch (e) {
              console.warn('Failed to update notified status:', e);
            }
          }
        }
      }
    };

    const interval = setInterval(checkDueReminders, 6000);
    return () => clearInterval(interval);
  }, []);

  // Notes state update handlers
  const handleNoteCreated = (newNote) => {
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
  };

  const handleNoteUpdated = (updatedNote) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const handleNoteDeleted = (deletedId) => {
    setNotes(prev => prev.filter(n => n.id !== deletedId));
    if (selectedNoteId === deletedId) {
      const remaining = notes.filter(n => n.id !== deletedId);
      setSelectedNoteId(remaining[0]?.id || null);
    }
  };

  const handleCreateFolder = async (folderName) => {
    try {
      const updatedFolders = await api.createFolder(folderName);
      setFolders(updatedFolders);
      addToast({ type: 'success', title: 'Folder Created', message: `Folder "${folderName}" ready.` });
    } catch (err) {
      addToast({ type: 'error', title: 'Folder Error', message: err.message });
    }
  };

  const handleDeleteFolder = async (folderName) => {
    try {
      const updatedFolders = await api.deleteFolder(folderName);
      setFolders(updatedFolders);
      loadInitialData(); // reload notes that may have been reassigned
    } catch (err) {
      addToast({ type: 'error', title: 'Folder Error', message: err.message });
    }
  };

  // Reminders state update handlers
  const handleReminderCreated = (newReminder) => {
    setReminders(prev => [newReminder, ...prev]);
  };

  const handleReminderUpdated = (updatedReminder) => {
    setReminders(prev => prev.map(r => r.id === updatedReminder.id ? updatedReminder : r));
  };

  const handleReminderDeleted = (deletedId) => {
    setReminders(prev => prev.filter(r => r.id !== deletedId));
  };

  // Direct navigation from Research to Notes
  const handleNavigateToNotes = (noteId) => {
    if (noteId) setSelectedNoteId(noteId);
    setActiveTab('notes');
  };

  const pendingRemindersCount = reminders.filter(r => r.status === 'pending').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab === 'settings' ? 'settings' : activeTab}
        setActiveTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        notesCount={notes.length}
        pendingRemindersCount={pendingRemindersCount}
        activeMemoriesCount={activeMemoriesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenVoice={() => setIsVoiceModalOpen(true)}
          addToast={addToast}
        />

        {/* Dynamic Views */}
        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'research' && (
            <ResearchChat
              folders={folders}
              onNoteCreated={handleNoteCreated}
              addToast={addToast}
              onNavigateToNotes={handleNavigateToNotes}
            />
          )}

          {activeTab === 'about-me' && (
            <AboutMeDashboard
              addToast={addToast}
            />
          )}

          {activeTab === 'health' && (
            <HealthGuardianDashboard
              addToast={addToast}
            />
          )}

          {activeTab === 'notes' && (
            <NotesLayout
              notes={notes}
              folders={folders}
              selectedNoteId={selectedNoteId}
              setSelectedNoteId={setSelectedNoteId}
              onNoteCreated={handleNoteCreated}
              onNoteUpdated={handleNoteUpdated}
              onNoteDeleted={handleNoteDeleted}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              addToast={addToast}
            />
          )}

          {activeTab === 'reminders' && (
            <RemindersDashboard
              reminders={reminders}
              onReminderCreated={handleReminderCreated}
              onReminderUpdated={handleReminderUpdated}
              onReminderDeleted={handleReminderDeleted}
              addToast={addToast}
            />
          )}
        </main>
      </div>

      {/* Hands-Free Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onReminderCreated={handleReminderCreated}
        onNoteCreated={handleNoteCreated}
        onWellnessLogged={() => loadInitialData()}
        addToast={addToast}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        addToast={addToast}
        notesCount={notes.length}
        remindersCount={reminders.length}
      />

      {/* Global Toast Stack */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

