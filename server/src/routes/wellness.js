import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// GET /api/wellness/today - Fetch current wellness dashboard state
router.get('/today', (req, res) => {
  try {
    const wellness = db.getTodayWellness();
    res.json(wellness);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wellness data', details: err.message });
  }
});

// POST /api/wellness/water - Log water intake
router.post('/water', (req, res) => {
  try {
    const { delta = 1 } = req.body;
    const updated = db.logWater(Number(delta));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update water intake', details: err.message });
  }
});

// POST /api/wellness/meal - Log breakfast, lunch, or dinner
router.post('/meal', (req, res) => {
  try {
    const { meal, note, time } = req.body;
    if (!meal || !['breakfast', 'lunch', 'dinner'].includes(meal.toLowerCase())) {
      return res.status(400).json({ error: 'Valid meal type required (breakfast, lunch, dinner)' });
    }

    const updated = db.logMeal(meal.toLowerCase(), { note, time });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log meal', details: err.message });
  }
});

// POST /api/wellness/break - Log a mindful break / stretch
router.post('/break', (req, res) => {
  try {
    const updated = db.logBreak();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log break', details: err.message });
  }
});

// POST /api/wellness/mood - Log mood and energy
router.post('/mood', (req, res) => {
  try {
    const { rating, note } = req.body;
    if (!rating) {
      return res.status(400).json({ error: 'Mood rating is required' });
    }
    const updated = db.logMood(rating, note);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log mood', details: err.message });
  }
});

// GET /api/wellness/check-in - Proactive Health Guardian Engine
// Analyzes current time and user habits to trigger gentle proactive nudges
router.get('/check-in', (req, res) => {
  try {
    const userId = req.user?.id;
    if (db.isQuietHours && db.isQuietHours(userId)) {
      return res.json({
        triggered: false,
        quietHours: true,
        message: 'Quiet hours are active. Proactive sound & meal notifications are paused to protect sleep.'
      });
    }

    const wellness = db.getTodayWellness(userId);
    const settings = wellness.settings || {};
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const lunchStart = parseTimeToMinutes(settings.lunchStart || '12:30');
    const lunchEnd = parseTimeToMinutes(settings.lunchEnd || '14:30');
    const dinnerStart = parseTimeToMinutes(settings.dinnerStart || '19:30');
    const dinnerEnd = parseTimeToMinutes(settings.dinnerEnd || '21:30');
    const lateNightStart = parseTimeToMinutes(settings.lateNightStart || '22:30');

    let nudge = null;

    // Check Dinner Threshold
    if (settings.mealRemindersEnabled !== false && !wellness.meals.dinner?.logged) {
      if (timeInMinutes >= dinnerStart && timeInMinutes <= dinnerEnd) {
        nudge = {
          triggered: true,
          type: 'dinner',
          severity: 'gentle',
          title: 'Dinner Threshold Check-in 🍲',
          message: `It is currently ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Alen. Remember to take a mindful pause for dinner and nourish yourself before diving back in.`,
          voiceText: `Alen, it is dinner time. Don't forget to pause and enjoy a nourishing meal.`,
          actionType: 'log_meal',
          actionPayload: { meal: 'dinner' }
        };
      }
    }

    // Check Late Night Threshold
    if (!nudge && settings.lateNightWarningEnabled !== false) {
      if (timeInMinutes >= lateNightStart || currentHour < 5) {
        nudge = {
          triggered: true,
          type: 'late_night',
          severity: 'warning',
          title: 'Late Night Guardian Alert 🌙',
          message: `You have been working diligently late into the night. Extended cognitive strain impacts tomorrow's creativity. Consider saving your work, resting your eyes, and wrapping up.`,
          voiceText: `Alen, you have been working late into the night. Take a gentle pause and give your mind some rest.`,
          actionType: 'sleep_reminder'
        };
      }
    }

    // Check Lunch Threshold
    if (!nudge && settings.mealRemindersEnabled !== false && !wellness.meals.lunch?.logged) {
      if (timeInMinutes >= lunchStart && timeInMinutes <= lunchEnd) {
        nudge = {
          triggered: true,
          type: 'lunch',
          severity: 'gentle',
          title: 'Lunch Break Reminder 🥗',
          message: `Midday recharge! It's prime lunch time. Step away from the screen for a nutritious meal to sustain your energy.`,
          voiceText: `Alen, it's lunch time. Take a break and nourish yourself.`,
          actionType: 'log_meal',
          actionPayload: { meal: 'lunch' }
        };
      }
    }

    // Check Hydration
    if (!nudge && settings.hydrationRemindersEnabled !== false) {
      const targetWater = settings.targetWaterGlasses || 8;
      if (wellness.waterGlasses < targetWater && currentHour >= 10 && currentHour <= 22) {
        // If it's evening and water is below 6
        if (currentHour >= 18 && wellness.waterGlasses < 6) {
          nudge = {
            triggered: true,
            type: 'hydration',
            severity: 'info',
            title: 'Hydration Guardian 💧',
            message: `Hydration reminder: You've logged ${wellness.waterGlasses} of ${targetWater} glasses today. Keep a fresh glass of water nearby!`,
            voiceText: `Hope here with a hydration reminder. Sip some water to stay refreshed.`,
            actionType: 'log_water'
          };
        }
      }
    }

    // Check Screen Break (if last break was over 90 mins ago)
    if (!nudge && settings.breakRemindersEnabled !== false && wellness.lastBreakAt) {
      const minutesSinceBreak = (Date.now() - new Date(wellness.lastBreakAt).getTime()) / 60000;
      if (minutesSinceBreak > 90) {
        nudge = {
          triggered: true,
          type: 'screen_break',
          severity: 'gentle',
          title: '20-20-20 Eye & Posture Break 🌿',
          message: `You've been focused for over 90 minutes. Look at something 20 feet away for 20 seconds, roll your shoulders, and take three deep breaths.`,
          voiceText: `Time for a quick stretch and eye break. Look away from the screen for twenty seconds.`,
          actionType: 'take_break'
        };
      }
    }

    // Check Medicine Reminders
    if (!nudge && settings.medicineRemindersEnabled !== false) {
      const medicines = db.getMedicines ? db.getMedicines() : [];
      const untakenMeds = medicines.filter(m => !m.takenToday && m.time);
      if (untakenMeds.length > 0) {
        for (const med of untakenMeds) {
          const medTimeMinutes = parseTimeToMinutes(med.time);
          if (timeInMinutes >= medTimeMinutes && timeInMinutes <= medTimeMinutes + 120) {
            nudge = {
              triggered: true,
              type: 'medicine',
              severity: 'important',
              title: `Medicine Reminder: ${med.name} 💊`,
              message: `Time for your scheduled dose of ${med.name} (${med.dosage || 'as advised'}). Remember to take it with water.`,
              voiceText: `Alen, it is time for your scheduled ${med.name}. Don't forget to take it with water.`,
              actionType: 'take_medicine',
              actionPayload: { medicineId: med.id }
            };
            break;
          }
        }
      }
    }

    if (!nudge) {
      return res.json({
        triggered: false,
        message: 'All daily wellness metrics and routines are currently well balanced. Hope is watching quietly.'
      });
    }

    res.json(nudge);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run proactive check-in', details: err.message });
  }
});

// PUT /api/wellness/settings - Update guardian settings
router.put('/settings', (req, res) => {
  try {
    const updated = db.updateWellnessSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update wellness settings', details: err.message });
  }
});

// GET /api/wellness/history - Fetch routine consistency history
router.get('/history', (req, res) => {
  try {
    const history = db.getWellnessHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wellness history', details: err.message });
  }
});

// GET /api/wellness/medicines - List scheduled medicines
router.get('/medicines', (req, res) => {
  try {
    const medicines = db.getMedicines();
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicines', details: err.message });
  }
});

// POST /api/wellness/medicines - Add a new scheduled medicine
router.post('/medicines', (req, res) => {
  try {
    const { name, dosage, time, category } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Medicine name is required' });
    }
    const created = db.addMedicine({ name, dosage, time, category });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add medicine', details: err.message });
  }
});

// POST /api/wellness/medicines/:id/toggle - Toggle medicine taken status
router.post('/medicines/:id/toggle', (req, res) => {
  try {
    const updated = db.toggleMedicine(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Medicine not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle medicine', details: err.message });
  }
});

// DELETE /api/wellness/medicines/:id - Remove medicine
router.delete('/medicines/:id', (req, res) => {
  try {
    db.deleteMedicine(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete medicine', details: err.message });
  }
});

// GET /api/wellness/mood-journal - Get decrypted mood journal entries
router.get('/mood-journal', (req, res) => {
  try {
    const journal = db.getMoodJournal();
    res.json(journal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mood journal', details: err.message });
  }
});

// POST /api/wellness/mood-journal - Add mood journal entry (encrypted at rest with AES-256-GCM)
router.post('/mood-journal', (req, res) => {
  try {
    const { rating, note, tags } = req.body;
    if (!rating) return res.status(400).json({ error: 'Rating is required' });
    const created = db.addMoodJournalEntry({ rating, note, tags });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add mood journal entry', details: err.message });
  }
});

// GET /api/wellness/consent - Get DPDP Act / GDPR health consent status
router.get('/consent', (req, res) => {
  try {
    const consent = db.getHealthConsent();
    res.json(consent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch consent status', details: err.message });
  }
});

// POST /api/wellness/consent - Update DPDP Act / GDPR health consent
router.post('/consent', (req, res) => {
  try {
    const { consentGiven, country } = req.body;
    const updated = db.updateHealthConsent({ consentGiven, country });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update consent', details: err.message });
  }
});

// GET /api/wellness/export - Export all health data in JSON (DPDP / GDPR Data Portability)
router.get('/export', (req, res) => {
  try {
    const exportData = db.exportAllHealthData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="hope-health-export-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export health records', details: err.message });
  }
});

// DELETE /api/wellness/delete-all - Erase all health data (Right to Erasure)
router.delete('/delete-all', (req, res) => {
  try {
    const result = db.deleteAllHealthData();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to erase health records', details: err.message });
  }
});

export default router;

