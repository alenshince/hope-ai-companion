import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Pin, 
  Folder, 
  Calendar, 
  FileText,
  Tag as TagIcon
} from 'lucide-react';
import FolderSidebar from './FolderSidebar';
import NoteEditor from './NoteEditor';
import { api } from '../../api';
import { playSuccessDing } from '../../utils/audio';

export default function NotesLayout({ 
  notes = [], 
  folders = [], 
  selectedNoteId, 
  setSelectedNoteId, 
  onNoteCreated, 
  onNoteUpdated, 
  onNoteDeleted,
  onCreateFolder,
  onDeleteFolder,
  addToast 
}) {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set();
    notes.forEach(n => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, [notes]);

  // Notes counts per folder
  const notesCountByFolder = useMemo(() => {
    const counts = { ALL: notes.length };
    folders.forEach(f => {
      counts[f] = notes.filter(n => (n.folder || 'Research').toLowerCase() === f.toLowerCase()).length;
    });
    return counts;
  }, [notes, folders]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (selectedFolder && (n.folder || 'Research').toLowerCase() !== selectedFolder.toLowerCase()) {
        return false;
      }
      if (selectedTag && (!Array.isArray(n.tags) || !n.tags.includes(selectedTag))) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesContent = n.content?.toLowerCase().includes(q);
        const matchesSummary = n.summary?.toLowerCase().includes(q);
        const matchesTag = Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesSummary && !matchesTag) {
          return false;
        }
      }
      return true;
    });
  }, [notes, selectedFolder, selectedTag, searchQuery]);

  // Active selected note
  const currentNote = notes.find(n => n.id === selectedNoteId) || filteredNotes[0] || notes[0];

  const handleCreateNewNote = async () => {
    try {
      const newNote = await api.createNote({
        title: 'Untitled Note',
        folder: selectedFolder || 'Research',
        tags: selectedTag ? [selectedTag] : ['draft'],
        content: `# Untitled Note\n\nBegin capturing your thoughts or research here...`,
        summary: ''
      });
      playSuccessDing();
      onNoteCreated(newNote);
      setSelectedNoteId(newNote.id);
      if (addToast) {
        addToast({
          type: 'success',
          title: 'New Note Created',
          message: 'Ready for writing or AI synthesis.'
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Failed to create note', message: err.message });
    }
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* 1. Left Folders & Tags Sidebar */}
      <FolderSidebar
        folders={folders}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        allTags={allTags}
        onCreateFolder={onCreateFolder}
        onDeleteFolder={onDeleteFolder}
        notesCountByFolder={notesCountByFolder}
      />

      {/* 2. Middle Notes List */}
      <div className="w-80 border-r border-slate-200/80 bg-white flex flex-col shrink-0 select-none">
        {/* Search & New Note Header */}
        <div className="p-3 border-b border-slate-200/80 space-y-2 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              {selectedFolder ? `${selectedFolder}` : selectedTag ? `#${selectedTag}` : 'All Notebooks'}
            </span>
            <button
              onClick={handleCreateNewNote}
              className="px-2.5 py-1 text-xs font-semibold bg-hope-600 hover:bg-hope-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Note</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in notes..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-hope-500"
            />
          </div>
        </div>

        {/* Note Cards Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 stroke-1 text-slate-300 mx-auto mb-2" />
              <p>No notes found.</p>
              <button
                onClick={handleCreateNewNote}
                className="mt-2 text-hope-600 font-semibold hover:underline"
              >
                Create your first note →
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = currentNote?.id === note.id;
              const dateStr = new Date(note.updatedAt || note.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-hope-50/80 border-l-4 border-hope-600 pl-2.5'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 flex-1">
                      {note.title || 'Untitled Note'}
                    </h4>
                    {note.isPinned && (
                      <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                    {note.summary || note.content?.replace(/#+\s*/g, '').slice(0, 100) || 'Empty note...'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      <Folder className="w-2.5 h-2.5" />
                      {note.folder || 'Research'}
                    </span>
                    <span>{dateStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Right Note Editor / Preview */}
      <NoteEditor
        note={currentNote}
        folders={folders}
        onUpdateNote={onNoteUpdated}
        onDeleteNote={onNoteDeleted}
        addToast={addToast}
      />
    </div>
  );
}

