import express from 'express';
import { searchWeb } from '../services/search.js';
import { synthesizeResearch, generateDialogueResponse, processVoiceCommand } from '../services/ai.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message, mode = 'research', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const trimmed = message.trim();

    if (mode === 'research') {
      // Step 1: Perform web search
      const searchResults = await searchWeb(trimmed, 5);

      // Step 2: Synthesize findings with Hope AI (incorporating user context)
      const synthesis = await synthesizeResearch({
        query: trimmed,
        searchResults,
        conversationHistory: history
      });

      return res.json({
        reply: synthesis.reply,
        sources: synthesis.sources,
        suggestedFollowUps: synthesis.suggestedFollowUps,
        usedModel: synthesis.usedModel,
        mode: 'research'
      });
    }

    // Direct Conversation Mode with Personalized Context
    const dialogue = await generateDialogueResponse({
      message: trimmed,
      history
    });

    return res.json({
      reply: dialogue.reply,
      sources: [],
      suggestedFollowUps: dialogue.suggestedFollowUps || [],
      usedModel: dialogue.usedModel,
      mode: 'chat'
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process conversation', details: err.message });
  }
});

// POST /api/chat/voice-command - Process spoken voice commands and execute actions
router.post('/voice-command', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Voice transcript is required' });
    }

    const result = await processVoiceCommand(transcript);
    res.json(result);
  } catch (err) {
    console.error('Voice command error:', err);
    res.status(500).json({ error: 'Failed to process voice command', details: err.message });
  }
});

export default router;

