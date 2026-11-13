import React from 'react';
import { 
  Sparkles, 
  Search, 
  FileText, 
  Bell, 
  Settings, 
  Heart,
  ChevronRight,
  ShieldCheck,
  Compass,
  Brain,
  Activity
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  notesCount = 0, 
  pendingRemindersCount = 0,
  activeMemoriesCount = 7,
  isCollapsed,
  setIsCollapsed 
}) {
  const navItems = [
    {
      id: 'research',
      label: 'Research Assistant',
      icon: Search,
      badge: null,
      description: 'Web synthesis & source citations'
    },
    {
      id: 'about-me',
      label: 'About Me & Memory',
      icon: Brain,
      badge: activeMemoriesCount > 0 ? `${activeMemoriesCount}` : null,
      badgeColor: 'bg-indigo-600 text-white',
      description: 'Personalized context & memory engine'
    },
    {
      id: 'health',
      label: 'Health Guardian',
      icon: Activity,
      badge: 'Active',
      badgeColor: 'bg-emerald-600 text-white',
      description: 'Wellness, routines & meal check-ins'
    },
    {
      id: 'notes',
      label: 'Smart Notes',
      icon: FileText,
      badge: notesCount > 0 ? notesCount : null,
      description: 'Folders, markdown & AI cleanup'
    },
    {
      id: 'reminders',
      label: 'Reminders & Tasks',
      icon: Bell,
      badge: pendingRemindersCount > 0 ? pendingRemindersCount : null,
      badgeColor: 'bg-amber-500 text-white',
      description: 'Natural language parsing & alerts'
    },
    {
      id: 'settings',
      label: 'Hope Settings',
      icon: Settings,
      badge: null,
      description: 'API keys, models & audio'
    }
  ];

  return (
    <aside className="w-64 bg-white/90 backdrop-blur border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none transition-all duration-300">
      {/* Top Branding */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-hope-400 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-hope-500/20 ring-4 ring-hope-50">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-900 tracking-tight text-lg">Hope</h1>
                <span className="text-[10px] font-semibold bg-hope-100 text-hope-800 px-1.5 py-0.5 rounded-full">
                  AI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Personal Companion</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspaces
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-hope-500 to-hope-600 text-white shadow-sm shadow-hope-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-hope-600'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    isActive 
                      ? 'bg-white/25 text-white' 
                      : item.badgeColor || 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Calming Companion Thought Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-hope-50/70 via-slate-50 to-indigo-50/50 p-3.5 rounded-2xl border border-hope-100/60">
          <div className="flex items-center gap-2 mb-1.5 text-hope-800 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Companion State</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed italic">
            "Clarity comes through quiet focus. Take your time, synthesis is unfolding."
          </p>
          <div className="mt-2.5 pt-2 border-t border-hope-100/40 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Hope Online
            </span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

