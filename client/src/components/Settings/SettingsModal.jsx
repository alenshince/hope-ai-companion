import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  Volume2, 
  Bell, 
  Globe, 
  Check, 
  ShieldCheck, 
  Server,
  Database,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api';
import { playCalmChime } from '../../utils/audio';
import { requestNotificationPermission, getNotificationPermission } from '../../utils/notifications';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings,
  addToast,
  notesCount = 0,
  remindersCount = 0
}) {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(settings?.model || 'gemini-2.0-flash');
  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled ?? true);
  const [useWebSearch, setUseWebSearch] = useState(settings?.useWebSearch ?? true);
  const [saving, setSaving] = useState(false);
  const [healthStatus, setHealthStatus] = useState('checking');

  useEffect(() => {
    if (settings) {
      setModel(settings.model || 'gemini-2.0-flash');
      setSoundEnabled(settings.soundEnabled ?? true);
      setUseWebSearch(settings.useWebSearch ?? true);
    }

    api.checkHealth()
      .then(() => setHealthStatus('healthy'))
      .catch(() => setHealthStatus('unreachable'));
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = {
        model,
        soundEnabled,
        useWebSearch
      };
      if (apiKey.trim()) {
        updates.geminiApiKey = apiKey.trim();
      }

      const updated = await api.updateSettings(updates);
      onUpdateSettings(updated);
      setApiKey('');
      if (addToast) {
        addToast({
          type: 'success',
          title: 'Settings Saved',
          message: 'Hope configuration updated successfully.'
        });
      }
      onClose();
    } catch (err) {
      if (addToast) {
        addToast({ type: 'error', title: 'Save Failed', message: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearApiKey = async () => {
    if (confirm('Clear configured API key and use the built-in Hope engine?')) {
      const updated = await api.updateSettings({ geminiApiKey: 'CLEAR' });
      onUpdateSettings(updated);
      setApiKey('');
      if (addToast) {
        addToast({ type: 'info', title: 'API Key Cleared', message: 'Switched to built-in Hope engine.' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-hope-100 text-hope-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hope Companion Settings</h3>
              <p className="text-xs text-slate-500">Configure AI models, storage, and companion preferences</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* API Key Configuration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-hope-600" />
                Gemini API Key (Optional)
              </label>
              {settings?.hasApiKey ? (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Key Active ({settings.geminiApiKey})
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Using Built-in Hope Engine
                </span>
              )}
            </div>

            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.hasApiKey ? "Enter new key to update..." : "AIzaSy... (leave blank for built-in engine)"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Hope functions 100% out-of-the-box even without an API key.</span>
              {settings?.hasApiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="text-rose-600 hover:underline"
                >
                  Clear Key
                </button>
              )}
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              AI Model Preference
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast, Recommended)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Lightweight)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
              <div className="flex items-center gap-2 text-slate-700">
                <Volume2 className="w-4 h-4 text-hope-600" />
                <div>
                  <span className="font-semibold block">Calming Reminder Chimes</span>
                  <span className="text-[11px] text-slate-400">Play harmonic bell alerts via Web Audio API</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-hope-600 focus:ring-hope-500"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
              <div className="flex items-center gap-2 text-slate-700">
                <Globe className="w-4 h-4 text-hope-600" />
                <div>
                  <span className="font-semibold block">Live Web Research by Default</span>
                  <span className="text-[11px] text-slate-400">Search and cite web articles for research queries</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
                className="w-4 h-4 rounded text-hope-600 focus:ring-hope-500"
              />
            </label>
          </div>

          {/* Diagnostics Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              System Diagnostics
            </span>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block">Backend</span>
                <span className="font-semibold text-emerald-600 capitalize">{healthStatus}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block">Notes Stored</span>
                <span className="font-semibold text-slate-800">{notesCount}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block">Reminders</span>
                <span className="font-semibold text-slate-800">{remindersCount}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
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
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold bg-hope-600 hover:bg-hope-700 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

