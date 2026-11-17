import express from 'express';
import { db } from '../db.js';
import { runAgentLoop } from '../services/agent/agentLoop.js';
import { processVoiceCommand } from '../services/ai.js';
import { detectLanguage } from '../services/language/detector.js';
import { buildBilingualCompanionPrompt } from '../services/personality/prompts.js';

const router = express.Router();

/**
 * SSE Streaming Chat & Reasoning Endpoint
 * Emits real-time 'status', 'delta', 'done', and 'error' events with bilingual companion persona.
 */
router.post('/stream', async (req, res) => {
  const { message, history = [], languagePreference = 'auto' } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const userContext = db.getActiveContextString ? db.getActiveContextString() : '';
    const wellnessStatus = db.getTodayWellness ? db.getTodayWellness() : null;
    const langInfo = detectLanguage(message, languagePreference);

    const systemInstruction = buildBilingualCompanionPrompt({
      languageMode: languagePreference,
      targetLanguage: langInfo.targetReplyLanguage,
      userContext,
      wellnessStatus
    });

    const result = await runAgentLoop({
      query: message.trim(),
      conversationHistory: history,
      systemInstruction,
      onStatus: (status) => {
        sendEvent('status', { message: status });
      },
      onDelta: (delta) => {
        sendEvent('delta', { text: delta });
      }
    });

    sendEvent('done', {
      reply: result.reply,
      sources: result.sources || [],
      usedModel: result.usedModel,
      toolCallCount: result.toolCallCount,
      language: langInfo
    });

    res.end();
  } catch (err) {
    console.error('Agent loop streaming error:', err);
    sendEvent('error', { error: err.message || 'Failed to process conversation' });
    res.end();
  }
});

/**
 * Standard JSON Chat Endpoint (with internal agent loop & tool calling)
 */
router.post('/', async (req, res) => {
  try {
    const { message, history = [], languagePreference = 'auto' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const trimmed = message.trim();
    const userContext = db.getActiveContextString ? db.getActiveContextString() : '';
    const wellnessStatus = db.getTodayWellness ? db.getTodayWellness() : null;
    const langInfo = detectLanguage(trimmed, languagePreference);

    const systemInstruction = buildBilingualCompanionPrompt({
      languageMode: languagePreference,
      targetLanguage: langInfo.targetReplyLanguage,
      userContext,
      wellnessStatus
    });

    let accumulatedDelta = '';
    const result = await runAgentLoop({
      query: trimmed,
      conversationHistory: history,
      systemInstruction,
      onDelta: (text) => {
        accumulatedDelta += text;
      }
    });

    return res.json({
      reply: result.reply || accumulatedDelta,
      sources: result.sources || [],
      usedModel: result.usedModel,
      language: langInfo,
      mode: 'agent_reasoning'
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
