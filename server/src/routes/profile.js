import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/profile - Fetch full user profile & active memories
router.get('/', (req, res) => {
  try {
    const profile = db.getProfile();
    const memories = db.getMemories();
    res.json({
      profile,
      memoriesCount: memories.length,
      activeMemoriesCount: memories.filter(m => m.isActive).length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

// PUT /api/profile - Update user profile information
router.put('/', (req, res) => {
  try {
    const updated = db.updateProfile(req.body);
    res.json({
      message: 'Profile updated successfully',
      profile: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

// GET /api/profile/memories - List all indexed memories
router.get('/memories', (req, res) => {
  try {
    const { category, search } = req.query;
    let memories = db.getMemories();

    if (category) {
      memories = memories.filter(m => m.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      memories = memories.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.content.toLowerCase().includes(q) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memories', details: err.message });
  }
});

// POST /api/profile/memories - Add new indexed memory
router.post('/memories', (req, res) => {
  try {
    const { category, title, content, tags, importance, isActive } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Memory content is required' });
    }

    const newMemory = db.createMemory({
      category: category || 'general',
      title: title || 'Personal Note',
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : [],
      importance: importance || 'normal',
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(newMemory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create memory', details: err.message });
  }
});

// PUT /api/profile/memories/:id - Update or toggle memory
router.put('/memories/:id', (req, res) => {
  try {
    const updated = db.updateMemory(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update memory', details: err.message });
  }
});

// DELETE /api/profile/memories/:id - Delete memory
router.delete('/memories/:id', (req, res) => {
  try {
    db.deleteMemory(req.params.id);
    res.json({ success: true, message: 'Memory deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete memory', details: err.message });
  }
});

// GET /api/profile/context - Raw context string used for AI injection
router.get('/context', (req, res) => {
  try {
    const contextString = db.getActiveContextString();
    res.json({ context: contextString });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assemble context', details: err.message });
  }
});

export default router;

