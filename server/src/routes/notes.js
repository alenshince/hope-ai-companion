import express from 'express';
import { db } from '../db.js';
import { cleanUpNoteText, summarizeNote, extractTags } from '../services/ai.js';

const router = express.Router();

// GET /api/notes
router.get('/', (req, res) => {
  try {
    const { folder, tag, search } = req.query;
    let notes = db.getNotes();

    if (folder) {
      notes = notes.filter(n => n.folder.toLowerCase() === folder.toLowerCase());
    }

    if (tag) {
      notes = notes.filter(n => Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.summary && n.summary.toLowerCase().includes(q))
      );
    }

    // Sort pinned notes to the top, then by updatedAt desc
    notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve notes', details: err.message });
  }
});

// GET /api/notes/:id
router.get('/:id', (req, res) => {
  try {
    const note = db.getNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve note', details: err.message });
  }
});

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const { title, content, folder, tags, isPinned, summary, sources } = req.body;
    let noteSummary = summary;
    let noteTags = tags;

    // If auto-summarize is requested or if summary is empty and content has reasonable length
    if (!noteSummary && content && content.length > 80) {
      noteSummary = await summarizeNote(content);
    }

    if ((!noteTags || noteTags.length === 0) && content) {
      noteTags = await extractTags(content);
    }

    const created = db.createNote({
      title: title || 'Untitled Note',
      content: content || '',
      folder: folder || 'Research',
      tags: noteTags || [],
      isPinned: Boolean(isPinned),
      summary: noteSummary || '',
      sources: sources || []
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note', details: err.message });
  }
});

// PUT /api/notes/:id
router.put('/:id', (req, res) => {
  try {
    const updated = db.updateNote(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Note not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note', details: err.message });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', (req, res) => {
  try {
    const deleted = db.deleteNote(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note', details: err.message });
  }
});

// POST /api/notes/ai/cleanup
router.post('/ai/cleanup', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const cleaned = await cleanUpNoteText(content);
    res.json({ cleanedContent: cleaned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cleanup note', details: err.message });
  }
});

// POST /api/notes/ai/summarize
router.post('/ai/summarize', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const summary = await summarizeNote(content);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to summarize note', details: err.message });
  }
});

// POST /api/notes/ai/tags
router.post('/ai/tags', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const tags = await extractTags(content);
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extract tags', details: err.message });
  }
});

// Folders
router.get('/folders/list', (req, res) => {
  res.json(db.getFolders());
});

router.post('/folders/create', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name is required' });
  const folders = db.createFolder(name);
  res.json(folders);
});

router.delete('/folders/:name', (req, res) => {
  const folders = db.deleteFolder(req.params.name);
  res.json(folders);
});

export default router;

