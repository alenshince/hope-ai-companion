import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  AlertCircle, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  RotateCcw,
  Sparkles,
  BellRing
} from 'lucide-react';

export default function ReminderCard({ 
  reminder, 
  onToggleComplete, 
  onSnooze, 
  onDelete, 
  onEdit 
}) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const isCompleted = reminder.status === 'completed';
  const dueDate = new Date(reminder.dueAt);
  const now = new Date();
  const isOverdue = !isCompleted && dueDate < now;

  // Format date relative or readable
  const formatDue = (date) => {
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  };

  const priorityStyles = {
    urgent: 'bg-rose-100 text-rose-800 border-rose-200',
    high: 'bg-amber-100 text-amber-800 border-amber-200',
    normal: 'bg-sky-50 text-sky-800 border-sky-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 relative group ${
      isCompleted
        ? 'bg-slate-50/70 border-slate-200 opacity-60'
        : isOverdue
        ? 'bg-rose-50/40 border-rose-200 shadow-xs'
        : 'bg-white border-slate-200/90 hover:border-hope-300 hover:shadow-md hover:shadow-hope-500/5'
    }`}>
      <div className="flex items-start gap-3.5">
        {/* Completion Checkbox */}
        <button
          onClick={() => onToggleComplete(reminder)}
          className="mt-0.5 text-slate-300 hover:text-hope-600 transition-colors shrink-0"
          title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
          ) : (
            <Circle className="w-5 h-5 group-hover:stroke-hope-600" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`text-sm font-semibold truncate ${
              isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
            }`}>
              {reminder.title}
            </h4>

            {/* Priority Badge */}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              priorityStyles[reminder.priority] || priorityStyles.normal
            }`}>
              {reminder.priority}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
            {/* Due Time */}
            <span className={`flex items-center gap-1 font-medium ${
              isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'
            }`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDue(dueDate)}</span>
              {isOverdue && <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">Overdue</span>}
            </span>

            {/* Category */}
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[11px]">
              {reminder.category || 'General'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Snooze Button */}
          {!isCompleted && (
            <div className="relative">
              <button
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Snooze reminder"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {showSnoozeMenu && (
                <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 w-36 text-xs text-slate-700">
                  <div className="px-3 py-1 font-semibold text-[10px] uppercase text-slate-400">
                    Snooze For
                  </div>
                  <button
                    onClick={() => {
                      onSnooze(reminder.id, 15);
                      setShowSnoozeMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-hope-50 hover:text-hope-700 transition-colors"
                  >
                    +15 minutes
                  </button>
                  <button
                    onClick={() => {
                      onSnooze(reminder.id, 60);
                      setShowSnoozeMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-hope-50 hover:text-hope-700 transition-colors"
                  >
                    +1 hour
                  </button>
                  <button
                    onClick={() => {
                      onSnooze(reminder.id, 1440); // 1 day
                      setShowSnoozeMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-hope-50 hover:text-hope-700 transition-colors"
                  >
                    Tomorrow
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Edit Button */}
          <button
            onClick={() => onEdit(reminder)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Edit reminder"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(reminder.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete reminder"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

