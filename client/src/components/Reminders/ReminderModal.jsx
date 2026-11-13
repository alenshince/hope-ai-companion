import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, AlertCircle, Check } from 'lucide-react';

export default function ReminderModal({ 
  isOpen, 
  onClose, 
  reminder, 
  onSave 
}) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('General');

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title || '');
      const d = new Date(reminder.dueAt || Date.now());
      setDueDate(d.toISOString().slice(0, 10));
      setDueTime(d.toTimeString().slice(0, 5));
      setPriority(reminder.priority || 'normal');
      setCategory(reminder.category || 'General');
    } else {
      setTitle('');
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
      setDueDate(tomorrow.toISOString().slice(0, 10));
      setDueTime('17:00');
      setPriority('normal');
      setCategory('General');
    }
  }, [reminder]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const combinedDateTime = new Date(`${dueDate}T${dueTime}`);
    onSave({
      id: reminder?.id,
      title: title.trim(),
      dueAt: isNaN(combinedDateTime.getTime()) ? new Date().toISOString() : combinedDateTime.toISOString(),
      priority,
      category
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 text-sm">
            {reminder ? 'Edit Reminder' : 'Create Reminder'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reminder Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Review quantum computing paper"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
              >
                <option value="General">General</option>
                <option value="Research">Research</option>
                <option value="Projects">Projects</option>
                <option value="Communication">Communication</option>
                <option value="Wellness">Wellness</option>
                <option value="Personal">Personal</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-hope-600 hover:bg-hope-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

