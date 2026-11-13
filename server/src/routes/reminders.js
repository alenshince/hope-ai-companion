import express from 'express';
import { db } from '../db.js';
import { parseNaturalLanguageReminder } from '../services/nlp.js';

const router = express.Router();

// GET /api/reminders
router.get('/', (req, res) => {
  try {
    const { status, category } = req.query;
    let reminders = db.getReminders();

    if (status) {
      reminders = reminders.filter(r => r.status.toLowerCase() === status.toLowerCase());
    }

    if (category) {
      reminders = reminders.filter(r => r.category.toLowerCase() === category.toLowerCase());
    }

    // Sort by dueAt ascending (earliest due first)
    reminders.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve reminders', details: err.message });
  }
});

// POST /api/reminders/parse
// Parses natural language input (e.g., "Remind me to review research on quantum computing tomorrow at 5 PM")
router.post('/parse', (req, res) => {
  try {
    const { input, autoCreate = true } = req.body;
    if (!input) return res.status(400).json({ error: 'Input text is required' });

    const parsed = parseNaturalLanguageReminder(input);

    if (autoCreate) {
      const created = db.createReminder({
        title: parsed.title,
        dueAt: parsed.dueAt,
        priority: parsed.priority,
        category: parsed.category,
        status: 'pending'
      });
      return res.status(201).json({
        reminder: created,
        parsedMetadata: parsed
      });
    }

    return res.json({ parsedMetadata: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse natural language reminder', details: err.message });
  }
});

// POST /api/reminders (direct manual creation)
router.post('/', (req, res) => {
  try {
    const { title, dueAt, priority, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Reminder title is required' });

    const created = db.createReminder({
      title,
      dueAt: dueAt || new Date().toISOString(),
      priority: priority || 'normal',
      category: category || 'General',
      status: 'pending'
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reminder', details: err.message });
  }
});

// PUT /api/reminders/:id
router.put('/:id', (req, res) => {
  try {
    const updated = db.updateReminder(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Reminder not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reminder', details: err.message });
  }
});

// POST /api/reminders/:id/snooze
router.post('/:id/snooze', (req, res) => {
  try {
    const { minutes = 15 } = req.body;
    const reminder = db.getReminder(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    const newDueAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const updated = db.updateReminder(req.params.id, {
      dueAt: newDueAt,
      notified: false,
      status: 'pending'
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to snooze reminder', details: err.message });
  }
});

// POST /api/reminders/:id/notified
router.post('/:id/notified', (req, res) => {
  try {
    const updated = db.updateReminder(req.params.id, { notified: true });
    if (!updated) return res.status(404).json({ error: 'Reminder not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark reminder notified', details: err.message });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', (req, res) => {
  try {
    const deleted = db.deleteReminder(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reminder', details: err.message });
  }
});

export default router;

