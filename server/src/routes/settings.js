import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const settings = db.getSettings();
    // Mask API key for security in response
    const masked = {
      ...settings,
      hasApiKey: Boolean(settings.geminiApiKey),
      geminiApiKey: settings.geminiApiKey ? `${settings.geminiApiKey.slice(0, 4)}...${settings.geminiApiKey.slice(-4)}` : ''
    };
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve settings', details: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { geminiApiKey, model, useWebSearch, soundEnabled, notificationsEnabled } = req.body;
    const current = db.getSettings();

    const updates = {};
    if (geminiApiKey !== undefined) {
      // If user typed 'CLEAR', clear it, or update if provided
      if (geminiApiKey === 'CLEAR') {
        updates.geminiApiKey = '';
      } else if (!geminiApiKey.includes('...')) {
        updates.geminiApiKey = geminiApiKey.trim();
      }
    }
    if (model !== undefined) updates.model = model;
    if (useWebSearch !== undefined) updates.useWebSearch = Boolean(useWebSearch);
    if (soundEnabled !== undefined) updates.soundEnabled = Boolean(soundEnabled);
    if (notificationsEnabled !== undefined) updates.notificationsEnabled = Boolean(notificationsEnabled);

    const updated = db.updateSettings(updates);
    res.json({
      ...updated,
      hasApiKey: Boolean(updated.geminiApiKey),
      geminiApiKey: updated.geminiApiKey ? `${updated.geminiApiKey.slice(0, 4)}...${updated.geminiApiKey.slice(-4)}` : ''
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
});

export default router;

