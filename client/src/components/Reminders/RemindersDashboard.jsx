import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Filter,
  Check,
  BellRing,
  RotateCcw
} from 'lucide-react';
import ReminderCard from './ReminderCard';
import ReminderModal from './ReminderModal';
import { api } from '../../api';
import { playCalmChime, playSuccessDing } from '../../utils/audio';
import { sendBrowserNotification } from '../../utils/notifications';

export default function RemindersDashboard({ 
  reminders = [], 
  onReminderCreated, 
  onReminderUpdated, 
  onReminderDeleted,
  addToast 
}) {
  const [nlpInput, setNlpInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'today', 'upcoming', 'completed', 'all'
  const [editingReminder, setEditingReminder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sampleNlpPhrases = [
    "Remind me to review research on quantum computing tomorrow at 5 PM",
    "Call Sarah in 2 hours #urgent",
    "Team sync on Friday at 11am",
    "Stretch and hydrate in 30 minutes"
  ];

  // Natural Language Submission
  const handleNlpSubmit = async (textToParse) => {
    const text = (textToParse || nlpInput).trim();
    if (!text || isParsing) return;

    setIsParsing(true);
    try {
      const res = await api.parseReminder(text, true);
      if (res.reminder) {
        onReminderCreated(res.reminder);
        setNlpInput('');
        playSuccessDing();

        if (addToast) {
          addToast({
            type: 'hope',
            title: 'Reminder Scheduled 🌿',
            message: `"${res.reminder.title}" set for ${new Date(res.reminder.dueAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`
          });
        }
      }
    } catch (err) {
      if (addToast) {
        addToast({ type: 'error', title: 'Could not parse reminder', message: err.message });
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle Complete / Incomplete
  const handleToggleComplete = async (reminder) => {
    const isCompleted = reminder.status === 'completed';
    const newStatus = isCompleted ? 'pending' : 'completed';
    try {
      const updated = await api.updateReminder(reminder.id, { status: newStatus });
      onReminderUpdated(updated);
      if (newStatus === 'completed') {
        playSuccessDing();
        if (addToast) {
          addToast({
            type: 'success',
            title: 'Task Completed!',
            message: `"${reminder.title}" marked as complete.`
          });
        }
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Update failed', message: err.message });
    }
  };

  // Snooze
  const handleSnooze = async (id, minutes) => {
    try {
      const updated = await api.snoozeReminder(id, minutes);
      onReminderUpdated(updated);
      if (addToast) {
        addToast({
          type: 'hope',
          title: 'Reminder Snoozed',
          message: `Snoozed until ${new Date(updated.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Snooze failed', message: err.message });
    }
  };

  // Delete
  const handleDelete = async (id) => {
    try {
      await api.deleteReminder(id);
      onReminderDeleted(id);
      if (addToast) {
        addToast({ type: 'info', title: 'Reminder Deleted', message: 'Item removed from schedule.' });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  // Save from Modal (Manual Create or Edit)
  const handleSaveModal = async (data) => {
    try {
      if (data.id) {
        const updated = await api.updateReminder(data.id, data);
        onReminderUpdated(updated);
      } else {
        const created = await api.createReminder(data);
        onReminderCreated(created);
      }
      playSuccessDing();
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Save failed', message: err.message });
    }
  };

  // Calculate Metrics & Filtering
  const now = new Date();
  const todayStr = now.toDateString();

  const dueTodayReminders = reminders.filter(r => {
    if (r.status === 'completed') return false;
    const d = new Date(r.dueAt);
    return d.toDateString() === todayStr || d < now;
  });

  const activeReminders = reminders.filter(r => r.status === 'pending');
  const completedReminders = reminders.filter(r => r.status === 'completed');

  const filteredReminders = reminders.filter(r => {
    const isCompleted = r.status === 'completed';
    const d = new Date(r.dueAt);

    if (activeTab === 'active') return !isCompleted;
    if (activeTab === 'today') return !isCompleted && (d.toDateString() === todayStr || d < now);
    if (activeTab === 'upcoming') return !isCompleted && d > now && d.toDateString() !== todayStr;
    if (activeTab === 'completed') return isCompleted;
    return true; // 'all'
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
        {/* Top NLP Input Banner */}
        <div className="bg-gradient-to-br from-hope-50/90 via-white to-indigo-50/50 p-6 rounded-3xl border border-hope-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 text-hope-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-hope-600" />
            <span>Hope Natural Language Scheduler</span>
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-1">
            What would you like to be reminded of?
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Type in everyday plain English. Hope automatically parses the exact date, time, topic, and urgency.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNlpSubmit();
            }}
            className="flex items-center gap-2 relative"
          >
            <input
              type="text"
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              placeholder="e.g. Remind me to review research on quantum computing tomorrow at 5 PM"
              disabled={isParsing}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500 shadow-inner placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!nlpInput.trim() || isParsing}
              className="px-5 py-3.5 rounded-2xl bg-hope-600 hover:bg-hope-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-xs tracking-wide transition-all shrink-0 flex items-center gap-1.5 shadow-sm shadow-hope-600/30"
            >
              {isParsing ? (
                <span>Scheduling...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Set Reminder</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Clickable Suggestions */}
          <div className="mt-4 pt-3 border-t border-hope-100/70">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Try a quick example:
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleNlpPhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleNlpSubmit(phrase)}
                  className="text-xs text-left bg-white hover:bg-hope-100/70 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span className="truncate">{phrase}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Today</span>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{dueTodayReminders.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tasks</span>
              <p className="text-2xl font-bold text-hope-600 mt-0.5">{activeReminders.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-hope-50 text-hope-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{completedReminders.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dashboard Tabs & Manual Create Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'active' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Active ({activeReminders.length})
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'today' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Today ({dueTodayReminders.length})
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'upcoming' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'completed' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Completed ({completedReminders.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={() => {
              setEditingReminder(null);
              setIsModalOpen(true);
            }}
            className="text-xs font-semibold text-slate-600 hover:text-hope-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Form</span>
          </button>
        </div>

        {/* Reminders List */}
        <div className="space-y-3">
          {filteredReminders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 stroke-1 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No reminders in this view</p>
              <p className="text-xs text-slate-400 mt-1">
                Your schedule is clean and calm. Use the input bar above to add any reminder.
              </p>
            </div>
          ) : (
            filteredReminders.map(rem => (
              <ReminderCard
                key={rem.id}
                reminder={rem}
                onToggleComplete={handleToggleComplete}
                onSnooze={handleSnooze}
                onDelete={handleDelete}
                onEdit={(r) => {
                  setEditingReminder(r);
                  setIsModalOpen(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Manual Add / Edit Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reminder={editingReminder}
        onSave={handleSaveModal}
      />
    </div>
  );
}

