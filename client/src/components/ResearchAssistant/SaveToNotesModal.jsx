import React, { useState, useEffect } from 'react';
import { X, FileText, Folder, Tag, Sparkles, Check } from 'lucide-react';
import { api } from '../../api';

export default function SaveToNotesModal({ 
  isOpen, 
  onClose, 
  researchData, 
  folders = [],
  onSaved 
}) {
  if (!isOpen || !researchData) return null;

  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('Research');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (researchData) {
      setTitle(researchData.query ? `Research: ${researchData.query}` : 'Research Synthesis');
      setFolder('Research');
      setTagsInput('research, web-synthesis, insights');
    }
  }, [researchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
        .filter(Boolean);

      const newNote = await api.createNote({
        title: title.trim() || 'Research Notes',
        folder,
        tags,
        content: researchData.reply,
        sources: researchData.sources || [],
        summary: `Synthesized research findings for: ${researchData.query || title}`
      });

      onSaved(newNote);
      onClose();
    } catch (err) {
      console.error('Failed to save to notes:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-hope-100 text-hope-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Save Research to Notes</h3>
              <p className="text-xs text-slate-500">Archive this synthesis directly into your notebooks</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Note Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                Target Folder
              </label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
              >
                {folders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="research, deep-tech"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
              />
            </div>
          </div>

          {/* Sources Summary pill */}
          {researchData.sources && researchData.sources.length > 0 && (
            <div className="bg-hope-50/60 p-3 rounded-xl border border-hope-100 flex items-center justify-between text-xs text-hope-900">
              <span className="font-medium">Attached Sources:</span>
              <span className="font-semibold bg-hope-200 text-hope-800 px-2 py-0.5 rounded-full">
                {researchData.sources.length} citations included
              </span>
            </div>
          )}

          {/* Footer Actions */}
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
              className="px-5 py-2 text-xs font-semibold bg-hope-600 hover:bg-hope-700 text-white rounded-xl shadow-sm shadow-hope-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>Saving to Notebook...</>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

