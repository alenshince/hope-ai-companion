import React, { useState } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Tag, 
  Hash, 
  Trash2, 
  Check, 
  X,
  Layers
} from 'lucide-react';

export default function FolderSidebar({
  folders = [],
  selectedFolder,
  setSelectedFolder,
  selectedTag,
  setSelectedTag,
  allTags = [],
  onCreateFolder,
  onDeleteFolder,
  notesCountByFolder = {}
}) {
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  return (
    <div className="w-56 bg-slate-50/80 border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none p-3 overflow-y-auto">
      <div className="space-y-4">
        {/* Folders Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Folders
            </span>
            <button
              onClick={() => setIsAddingFolder(!isAddingFolder)}
              className="p-1 text-slate-400 hover:text-hope-600 rounded transition-colors"
              title="Add New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Folder Inline Form */}
          {isAddingFolder && (
            <form onSubmit={handleCreate} className="mb-2 px-1 flex items-center gap-1">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                autoFocus
                className="w-full text-xs px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-hope-500"
              />
              <button
                type="submit"
                className="p-1 bg-hope-600 text-white rounded hover:bg-hope-700"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingFolder(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}

          {/* All Notes Button */}
          <button
            onClick={() => {
              setSelectedFolder(null);
              setSelectedTag(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedFolder && !selectedTag
                ? 'bg-hope-500 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              <span>All Notes</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              !selectedFolder && !selectedTag ? 'bg-white/25 text-white' : 'text-slate-400'
            }`}>
              {notesCountByFolder.ALL || 0}
            </span>
          </button>

          {/* Folders List */}
          <div className="mt-1 space-y-0.5">
            {folders.map((folder) => {
              const isSelected = selectedFolder === folder;
              const count = notesCountByFolder[folder] || 0;

              return (
                <div
                  key={folder}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-hope-100/90 text-hope-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                  onClick={() => {
                    setSelectedFolder(folder);
                    setSelectedTag(null);
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-hope-600' : 'text-slate-400'}`} />
                    <span className="truncate">{folder}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-hope-200 text-hope-800' : 'text-slate-400'
                    }`}>
                      {count}
                    </span>

                    {/* Don't allow deleting default Research folder */}
                    {folder !== 'Research' && folder !== 'Daily Notes' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete folder "${folder}"? Notes will move to Research.`)) {
                            onDeleteFolder(folder);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 transition-opacity"
                        title="Delete folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags Cloud Section */}
        {allTags.length > 0 && (
          <div className="pt-3 border-t border-slate-200/70">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Tags
              </span>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-[10px] text-hope-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1 px-1">
              {allTags.map((t) => {
                const isSelected = selectedTag === t;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedTag(isSelected ? null : t);
                      setSelectedFolder(null);
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-all flex items-center gap-0.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200/80'
                    }`}
                  >
                    <Hash className="w-2.5 h-2.5 opacity-60" />
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-200/70 text-[11px] text-slate-400 text-center">
        Markdown & AI enabled
      </div>
    </div>
  );
}

