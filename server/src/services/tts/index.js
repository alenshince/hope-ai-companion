import { EdgeTTSProvider, FEMALE_VOICES } from './edge.js';
import { prepareSpokenVersion } from './cleaner.js';
import { getAudioCacheKey, getCachedAudio, setCachedAudio } from './cache.js';

let defaultTTSProvider = new EdgeTTSProvider();

export function setTTSProvider(provider) {
  defaultTTSProvider = provider;
}

export function getTTSProvider() {
  return defaultTTSProvider;
}

// In-memory sliding window rate limiter: max 30 TTS requests per minute per IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

export function checkTTSRateLimit(clientIp) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientIp) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - validTimestamps[0])) / 1000) };
  }

  validTimestamps.push(now);
  rateLimitMap.set(clientIp, validTimestamps);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - validTimestamps.length };
}

/**
 * Main TTS Synthesis Service
 * Cleans text into natural spoken form, checks cache, calls provider, and caches result.
 */
export async function synthesizeSpeech({
  text,
  language = 'auto',
  voice,
  speed = 1.0,
  clientIp = 'default'
}) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text to synthesize is required');
  }

  // Rate limit check
  const rateLimit = checkTTSRateLimit(clientIp);
  if (!rateLimit.allowed) {
    const err = new Error(`TTS rate limit exceeded. Please retry in ${rateLimit.retryAfterSec} seconds.`);
    err.statusCode = 429;
    throw err;
  }

  // 1. Prepare clean spoken text
  const { spokenText, isMalayalam } = prepareSpokenVersion(text, language);
  if (!spokenText) {
    throw new Error('Prepared spoken text is empty');
  }

  // 2. Select voice
  const selectedVoice = voice || (isMalayalam ? FEMALE_VOICES.malayalam : FEMALE_VOICES.english);

  // 3. Check audio cache
  const cacheKey = getAudioCacheKey(spokenText, selectedVoice, speed);
  const cached = getCachedAudio(cacheKey);
  if (cached) {
    return {
      audioBuffer: cached,
      cached: true,
      voice: selectedVoice,
      spokenText
    };
  }

  // 4. Synthesize via provider
  const provider = getTTSProvider();
  const audioBuffer = await provider.synthesize(spokenText, {
    voice: selectedVoice,
    language: isMalayalam ? 'malayalam' : 'english',
    speed
  });

  // 5. Store in cache
  setCachedAudio(cacheKey, audioBuffer);

  return {
    audioBuffer,
    cached: false,
    voice: selectedVoice,
    spokenText
  };
}

export { FEMALE_VOICES, prepareSpokenVersion };

