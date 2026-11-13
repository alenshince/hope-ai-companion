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
    const wellness = db.getTodayWellness();
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

export default router;

