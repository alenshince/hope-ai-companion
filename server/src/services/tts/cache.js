import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = path.resolve(__dirname, '../../../data/audio_cache');

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// In-memory cache for ultra-fast instant playback of recent speech
const memoryCache = new Map();
const MAX_MEMORY_ITEMS = 100;

export function getAudioCacheKey(text, voice, speed = 1.0) {
  const hash = crypto.createHash('sha256');
  hash.update(`${voice}__${speed}__${text.trim()}`);
  return hash.digest('hex');
}

export function getCachedAudio(key) {
  // 1. Check in-memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // 2. Check disk cache
  const filePath = path.join(CACHE_DIR, `${key}.mp3`);
  if (fs.existsSync(filePath)) {
    try {
      const buffer = fs.readFileSync(filePath);
      memoryCache.set(key, buffer);
      return buffer;
    } catch (err) {
      console.warn('Failed reading cached audio file:', err.message);
    }
  }

  return null;
}

export function setCachedAudio(key, buffer) {
  if (!buffer || buffer.length === 0) return;

  // Store in memory
  if (memoryCache.size >= MAX_MEMORY_ITEMS) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, buffer);

  // Store to disk asynchronously
  const filePath = path.join(CACHE_DIR, `${key}.mp3`);
  fs.writeFile(filePath, buffer, (err) => {
    if (err) console.warn('Failed writing audio cache file:', err.message);
  });
}

