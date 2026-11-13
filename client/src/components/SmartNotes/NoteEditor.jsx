import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, 
  FileText, 
  Tag, 
  Folder, 
  Pin, 
  Save, 
  Check, 
  List, 
  CheckSquare, 
  Code, 
  Heading1, 
  Heading2, 
  Quote, 
  ExternalLink,
  Split,
  Eye,
  Edit3,
  Globe,
  Trash2,
  Share2
} from 'lucide-react';
import { api } from '../../api';
import { playSuccessDing } from '../../utils/audio';

export default function NoteEditor({ 
  note, 
  folders = [], 
  onUpdateNote, 
  onDeleteNote,
  addToast 
}) {
  if (!note) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white p-8">
        <FileText className="w-12 h-12 stroke-1 text-slate-300 mb-3" />
        <h3 className="font-medium text-slate-600">No Note Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
          Select an existing note from the list or create a new note to start writing.
        </p>
      </div>
    );
  }

  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [folder, setFolder] = useState(note.folder || 'Research');
  const [tags, setTags] = useState(note.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(Boolean(note.isPinned));
  const [summary, setSummary] = useState(note.summary || '');
  const [sources, setSources] = useState(note.sources || []);
  const [viewMode, setViewMode] = useState('split'); // 'edit', 'preview', 'split'
  const [aiLoading, setAiLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'

  const textareaRef = useRef(null);

  // Sync state when note selection changes
  useEffect(() => {
    setTitle(note.title || '');
    setContent(note.content || '');
    setFolder(note.folder || 'Research');
    setTags(note.tags || []);
    setIsPinned(Boolean(note.isPinned));
    setSummary(note.summary || '');
    setSources(note.sources || []);
    setSaveStatus('saved');
  }, [note.id]);

  // Debounced auto-save or save handler
  const handleSave = async (overrideData = {}) => {
    setSaveStatus('saving');
    try {
      const payload = {
        title: overrideData.title !== undefined ? overrideData.title : title,
        content: overrideData.content !== undefined ? overrideData.content : content,
        folder: overrideData.folder !== undefined ? overrideData.folder : folder,
        tags: overrideData.tags !== undefined ? overrideData.tags : tags,
        isPinned: overrideData.isPinned !== undefined ? overrideData.isPinned : isPinned,
        summary: overrideData.summary !== undefined ? overrideData.summary : summary,
        sources: overrideData.sources !== undefined ? overrideData.sources : sources
      };

      const updated = await api.updateNote(note.id, payload);
      onUpdateNote(updated);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save note:', err);
      setSaveStatus('unsaved');
      if (addToast) {
        addToast({ type: 'error', title: 'Save Failed', message: err.message });
      }
    }
  };

  // AI Action 1: Clean Up Raw Thoughts
  const handleAiCleanUp = async () => {
    if (!content.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await api.cleanupNote(content);
      if (res.cleanedContent) {
        setContent(res.cleanedContent);
        handleSave({ content: res.cleanedContent });
        playSuccessDing();
        if (addToast) {
          addToast({
            type: 'hope',
            title: 'Hope Refined Your Note',
            message: 'Streamlined thoughts into clean structured markdown.'
          });
        }
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Cleanup Failed', message: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  // AI Action 2: Auto-Summarize Note
  const handleAiSummarize = async () => {
    if (!content.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await api.summarizeNote(content);
      if (res.summary) {
        setSummary(res.summary);
        handleSave({ summary: res.summary });
        playSuccessDing();
        if (addToast) {
          addToast({
            type: 'hope',
            title: 'Executive Summary Created',
            message: res.summary
          });
        }
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Summary Failed', message: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  // AI Action 3: Auto-Extract Tags & Keywords
  const handleAiExtractTags = async () => {
    if (!content.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await api.extractTags(content);
      if (res.tags && res.tags.length > 0) {
        // Merge with existing
        const combined = Array.from(new Set([...tags, ...res.tags]));
        setTags(combined);
        handleSave({ tags: combined });
        playSuccessDing();
        if (addToast) {
          addToast({
            type: 'hope',
            title: 'Keywords Extracted',
            message: `Added tags: ${res.tags.join(', ')}`
          });
        }
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Tagging Failed', message: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  // Insert markdown helpers
  const insertFormatting = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setSaveStatus('unsaved');

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (val && !tags.includes(val)) {
        const nextTags = [...tags, val];
        setTags(nextTags);
        setTagInput('');
        handleSave({ tags: nextTags });
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const nextTags = tags.filter(t => t !== tagToRemove);
    setTags(nextTags);
    handleSave({ tags: nextTags });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Top Controls Header */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveStatus('unsaved');
            }}
            onBlur={() => handleSave()}
            placeholder="Note Title..."
            className="w-full text-lg font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Folder Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600">
            <Folder className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={folder}
              onChange={(e) => {
                setFolder(e.target.value);
                handleSave({ folder: e.target.value });
              }}
              className="bg-transparent border-none text-xs focus:outline-none cursor-pointer"
            >
              {folders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Pin Toggle */}
          <button
            onClick={() => {
              const next = !isPinned;
              setIsPinned(next);
              handleSave({ isPinned: next });
            }}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              isPinned
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            title={isPinned ? 'Pinned Note' : 'Pin Note to Top'}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'edit' ? 'bg-white text-slate-800 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Edit Mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'split' ? 'bg-white text-slate-800 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Split View"
            >
              <Split className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'preview' ? 'bg-white text-slate-800 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Preview Mode"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Manual Save / Status */}
          <button
            onClick={() => handleSave()}
            disabled={saveStatus === 'saved'}
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium flex items-center gap-1 transition-colors ${
              saveStatus === 'saved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-90'
                : 'bg-hope-600 text-white border-hope-600 hover:bg-hope-700 shadow-xs'
            }`}
          >
            {saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : saveStatus === 'saving' ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${title || 'this note'}"?`)) {
                onDeleteNote(note.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Assistant Bar */}
      <div className="px-4 py-2 bg-gradient-to-r from-hope-50/60 via-slate-50 to-indigo-50/40 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-hope-900 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-hope-600" />
            Hope AI Tools:
          </span>

          <button
            onClick={handleAiCleanUp}
            disabled={aiLoading}
            className="px-2.5 py-1 bg-white hover:bg-hope-50 text-hope-800 border border-hope-200/70 rounded-lg font-medium shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Transform raw stream-of-consciousness thoughts into polished markdown"
          >
            <span>✨ AI Clean Up</span>
          </button>

          <button
            onClick={handleAiSummarize}
            disabled={aiLoading}
            className="px-2.5 py-1 bg-white hover:bg-hope-50 text-slate-700 border border-slate-200 rounded-lg font-medium shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Generate a 2-sentence executive summary"
          >
            <span>📝 Auto-Summarize</span>
          </button>

          <button
            onClick={handleAiExtractTags}
            disabled={aiLoading}
            className="px-2.5 py-1 bg-white hover:bg-hope-50 text-slate-700 border border-slate-200 rounded-lg font-medium shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Extract semantic keyword tags from content"
          >
            <span>🏷️ Auto-Tags</span>
          </button>
        </div>

        {/* Markdown Helpers */}
        <div className="flex items-center gap-1 text-slate-500">
          <button onClick={() => insertFormatting('# ')} className="p-1 hover:bg-slate-200/70 rounded" title="Heading 1">
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => insertFormatting('## ')} className="p-1 hover:bg-slate-200/70 rounded" title="Heading 2">
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => insertFormatting('- ')} className="p-1 hover:bg-slate-200/70 rounded" title="Bullet List">
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => insertFormatting('- [ ] ')} className="p-1 hover:bg-slate-200/70 rounded" title="Checklist item">
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => insertFormatting('`', '`')} className="p-1 hover:bg-slate-200/70 rounded" title="Inline Code">
            <Code className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => insertFormatting('> ')} className="p-1 hover:bg-slate-200/70 rounded" title="Quote">
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary Box (if present) */}
      {summary && (
        <div className="mx-4 mt-3 p-3 bg-hope-50/70 border border-hope-200/80 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-hope-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-hope-900 block mb-0.5">Executive Summary</span>
            <p className="text-hope-800 leading-relaxed">{summary}</p>
          </div>
        </div>
      )}

      {/* Tags Chips Bar */}
      <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-400 flex items-center gap-1 mr-1">
          <Tag className="w-3 h-3" />
          Tags:
        </span>
        {tags.map(t => (
          <span
            key={t}
            className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium group"
          >
            <span>#{t}</span>
            <button
              onClick={() => handleRemoveTag(t)}
              className="hover:text-rose-600 ml-0.5 text-slate-400"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="+ tag (press Enter)"
          className="text-xs bg-transparent border-none focus:outline-none placeholder:text-slate-400 py-0.5 px-1 w-28"
        />
      </div>

      {/* Main Content Area (Split / Edit / Preview) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex-1 h-full flex flex-col ${viewMode === 'split' ? 'border-r border-slate-200' : ''}`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaveStatus('unsaved');
              }}
              onBlur={() => handleSave()}
              placeholder="Write your note in Markdown or dump raw thoughts here..."
              className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-slate-800 bg-white resize-none focus:outline-none"
            />
          </div>
        )}

        {/* Live Preview Area */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="flex-1 h-full overflow-y-auto p-6 bg-slate-50/40">
            <div className="max-w-2xl mx-auto prose-hope">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || '*No content yet. Type in the editor to see live formatted Markdown.*'}
              </ReactMarkdown>

              {/* Citations section in note if present */}
              {sources && sources.length > 0 && (
                <div className="mt-8 pt-4 border-t border-slate-200 not-prose">
                  <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                    <Globe className="w-3.5 h-3.5 text-hope-600" />
                    Attached Research Citations
                  </h4>
                  <div className="space-y-1.5">
                    {sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-hope-600 hover:text-hope-800 hover:underline flex items-center gap-1"
                      >
                        <span className="font-mono text-[10px] text-slate-400">[{idx + 1}]</span>
                        <span className="font-medium">{s.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

