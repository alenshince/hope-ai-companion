import React, { useState, useEffect } from 'react';
import { Volume2, Bell, BellOff, Check, Cpu, Clock, Mic, Sparkles, Brain, Activity } from 'lucide-react';
import { playCalmChime } from '../utils/audio';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification
} from '../utils/notifications';

export default function Header({
  activeTab,
  settings,
  onOpenSettings,
  onOpenVoice,
  addToast
}) {
  const [permission, setPermission] = useState('default');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setPermission(getNotificationPermission());

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTestSound = () => {
    playCalmChime();
    if (addToast) {
      addToast({
        type: 'hope',
        title: 'Calming Chime',
        message: 'A harmonic reminder chime synthesized with Web Audio.'
      });
    }
  };

  const handleToggleNotification = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      sendBrowserNotification('Hope Notifications Active', {
        body: 'You will receive gentle alerts for upcoming reminders.'
      });
      if (addToast) {
        addToast({
          type: 'success',
          title: 'Notifications Enabled',
          message: 'Hope will alert you when scheduled reminders are due.'
        });
      }
    } else {
      if (addToast) {
        addToast({
          type: 'error',
          title: 'Notifications Blocked',
          message: 'Permission was denied. You can re-enable notifications in your browser address bar.'
        });
      }
    }
  };

  const titles = {
    research: {
      title: 'Research Assistant',
      subtitle: 'Ask complex questions, synthesize web findings, and cite verified sources'
    },
    'about-me': {
      title: 'Personalized Context & Memory Core',
      subtitle: 'Alen Shince • S5 CSE MBCCET • HIVE Creative Lead & Project Ecosystem'
    },
    health: {
      title: 'Health & Lifestyle Guardian',
      subtitle: 'Wellness monitoring, proactive meal thresholds, hydration & mindful breaks'
    },
    notes: {
      title: 'Smart Notes',
      subtitle: 'Organize ideas into folders, write in markdown, and refine thoughts with AI'
    },
    reminders: {
      title: 'Reminders & Tasks',
      subtitle: 'Natural language scheduling, active notifications, and peaceful time management'
    },
    settings: {
      title: 'Hope Settings & Engine',
      subtitle: 'Configure AI models, sound preferences, and data persistence'
    }
  };

  const current = titles[activeTab] || titles.research;

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/70 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
      <div>
        <h2 className="text-base font-semibold text-slate-800 tracking-tight flex items-center gap-2">
          {current.title}
        </h2>
        <p className="text-xs text-slate-500 hidden sm:block">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Current Time Display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime}</span>
        </div>

        {/* Voice Assistant Module Toggle */}
        <button
          onClick={onOpenVoice}
          className="flex items-center gap-2 text-xs font-semibold bg-gradient-to-r from-hope-500 to-indigo-600 hover:from-hope-600 hover:to-indigo-700 text-white px-3 py-1.5 rounded-xl shadow-sm shadow-hope-500/25 transition-all group ring-2 ring-hope-100"
          title="Open Hands-Free Voice Assistant"
        >
          <Mic className="w-3.5 h-3.5 animate-pulse text-white" />
          <span className="hidden sm:inline">Talk to Hope</span>
          {/* Mini audio wave visual bars */}
          <div className="flex items-center gap-0.5 ml-0.5">
            <span className="w-0.5 h-2 bg-white/70 rounded-full animate-[bounce_1s_infinite_100ms]" />
            <span className="w-0.5 h-3.5 bg-white rounded-full animate-[bounce_1s_infinite_200ms]" />
            <span className="w-0.5 h-2.5 bg-white/80 rounded-full animate-[bounce_1s_infinite_300ms]" />
            <span className="w-0.5 h-1.5 bg-white/60 rounded-full animate-[bounce_1s_infinite_400ms]" />
          </div>
        </button>

        {/* AI Engine Pill */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-xs font-medium bg-hope-50 hover:bg-hope-100 text-hope-800 border border-hope-200/60 px-2.5 py-1 rounded-lg transition-colors"
          title="Click to view AI Settings"
        >
          <Cpu className="w-3.5 h-3.5 text-hope-600" />
          <span className="hidden sm:inline">
            {settings?.hasApiKey ? (settings?.model || 'Gemini 2.0') : 'Hope Engine'}
          </span>
        </button>

        {/* Notification Permission Pill */}
        <button
          onClick={handleToggleNotification}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors ${permission === 'granted'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          title={permission === 'granted' ? 'Browser notifications enabled' : 'Click to enable notifications'}
        >
          {permission === 'granted' ? (
            <>
              <Bell className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">Alerts On</span>
            </>
          ) : (
            <>
              <BellOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Enable Alerts</span>
            </>
          )}
        </button>

        {/* Sound Chime Tester */}
        <button
          onClick={handleTestSound}
          className="p-1.5 rounded-lg text-slate-500 hover:text-hope-600 hover:bg-slate-100 transition-colors"
          title="Test Hope's Calming Chime"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

