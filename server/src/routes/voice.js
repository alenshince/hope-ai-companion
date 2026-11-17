import express from 'express';
import { synthesizeSpeech, prepareSpokenVersion, FEMALE_VOICES } from '../services/tts/index.js';

const router = express.Router();

/**
 * POST /api/voice/tts
 * Synthesizes speech to neural MP3 audio with caching and rate limiting.
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, language = 'auto', voice, speed = 1.0 } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text to synthesize is required' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';

    const result = await synthesizeSpeech({
      text,
      language,
      voice,
      speed: Number(speed) || 1.0,
      clientIp: String(clientIp)
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('X-Audio-Cached', String(result.cached));
    res.setHeader('X-Audio-Voice', result.voice);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h client cache

    return res.end(result.audioBuffer);
  } catch (err) {
    console.error('Voice TTS endpoint error:', err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      error: 'TTS synthesis failed',
      details: err.message
    });
  }
});

/**
 * POST /api/voice/prepare
 * Returns clean spoken version of text (markdown stripped, Manglish phonetically mapped)
 */
router.post('/prepare', (req, res) => {
  try {
    const { text, language = 'auto' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prepared = prepareSpokenVersion(text, language);
    return res.json(prepared);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/voice/voices
 * Returns available voice configurations
 */
router.get('/voices', (req, res) => {
  res.json({
    femaleVoices: FEMALE_VOICES,
    supportedLanguages: ['ml-IN', 'en-IN']
  });
});

export default router;

