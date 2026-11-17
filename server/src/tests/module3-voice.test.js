import assert from 'node:assert/strict';
import {
  prepareSpokenVersion,
  stripMarkdown,
  stripEmojis,
  convertManglishToScript,
  splitIntoSentences
} from '../services/tts/cleaner.js';
import { getAudioCacheKey, getCachedAudio, setCachedAudio } from '../services/tts/cache.js';
import { checkTTSRateLimit, synthesizeSpeech, FEMALE_VOICES } from '../services/tts/index.js';

console.log('==================================================');
console.log('🧪 RUNNING MODULE 3 TESTS: FEMALE VOICE & BILINGUAL TTS');
console.log('==================================================\n');

// 1. Text Cleaner & Markdown Stripper
console.log('[1/4] Testing Spoken Text Pre-processor & Sanitizer...');
const rawMarkdown = `### Hello Hope! 🌿
Here is **important** information with a [web link](https://example.com/health) and \`code snippet\`!
- Bullet 1 with emoji ✨
- Bullet 2 with url https://alenshince.github.io
> Hope says: "Stay hydrated!"`;

const cleaned = stripMarkdown(rawMarkdown);
assert.ok(!cleaned.includes('###'), 'Headers should be removed');
assert.ok(!cleaned.includes('**'), 'Bold syntax should be removed');
assert.ok(!cleaned.includes('https://'), 'URLs should be stripped');
assert.ok(!cleaned.includes('`'), 'Code ticks should be stripped');
assert.ok(!cleaned.includes('- Bullet'), 'Bullet asterisks/dashes should be cleaned');
assert.ok(cleaned.includes('important'), 'Content words should be retained');
assert.ok(cleaned.includes('web link'), 'Link anchor text should be retained');
console.log('  ✓ Markdown stripping verified.');

const rawWithEmojis = 'Namaskaram! 🌿🌸 Hope is here 😊✨';
const noEmojis = stripEmojis(rawWithEmojis);
assert.ok(!/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}]/u.test(noEmojis), 'Emojis should be completely removed');
assert.strictEqual(noEmojis, 'Namaskaram! Hope is here', 'Text should remain clean');
console.log('  ✓ Emoji stripping verified.');

// 2. Manglish to Malayalam Script Conversion for Neural TTS
console.log('\n[2/4] Testing Manglish Phonetic-to-Script Mapping for Neural TTS...');
const manglishSentence = 'enthokke undu vishesham chechi? sukhamano? saramilla tto!';
const converted = convertManglishToScript(manglishSentence);
assert.ok(converted.includes('എന്തൊക്കെ'), 'enthokke -> എന്തൊക്കെ');
assert.ok(converted.includes('വിശേഷം'), 'vishesham -> വിശേഷം');
assert.ok(converted.includes('ചേച്ചി'), 'chechi -> ചേച്ചി');
assert.ok(converted.includes('സുഖമാണോ'), 'sukhamano -> സുഖമാണോ');
assert.ok(converted.includes('സാരമില്ല'), 'saramilla -> സാരമില്ല');
assert.ok(converted.includes('ട്ടോ'), 'tto -> ട്ടോ');
console.log('  ✓ Manglish words converted to Malayalam script for accurate pronunciation.');

const spokenPrep = prepareSpokenVersion('Hey chechi! Innu kazhicho? Check https://mysite.com 👍', 'malayalam');
assert.ok(spokenPrep.isMalayalam, 'Must be marked as Malayalam');
assert.ok(spokenPrep.spokenText.includes('ചേച്ചി'), 'Must contain converted Malayalam script');
assert.ok(!spokenPrep.spokenText.includes('https://'), 'Must not contain URL');
assert.ok(spokenPrep.sentences.length >= 2, 'Must split into multiple spoken sentences');
console.log('  ✓ Complete spoken preparation pipeline verified.');

// 3. Audio Caching and Rate Limiter
console.log('\n[3/4] Testing Audio Caching & Rate Limiting...');
const testKey = getAudioCacheKey('Test phrase for audio caching', 'en-IN-NeerjaNeural', 1.0);
const dummyBuffer = Buffer.from('FAKE_MP3_STREAM_DATA_12345');
setCachedAudio(testKey, dummyBuffer);

const retrieved = getCachedAudio(testKey);
assert.ok(retrieved, 'Should retrieve cached audio buffer');
assert.strictEqual(retrieved.toString(), dummyBuffer.toString(), 'Cached buffer content should match');
console.log('  ✓ Audio caching hit verified.');

// Test Rate Limiter (30 requests max per minute)
const testIp = '192.168.1.99';
let allowedCount = 0;
for (let i = 0; i < 35; i++) {
  const check = checkTTSRateLimit(testIp);
  if (check.allowed) allowedCount++;
}
assert.strictEqual(allowedCount, 30, 'Should allow exactly 30 requests per window');
const blockedCheck = checkTTSRateLimit(testIp);
assert.strictEqual(blockedCheck.allowed, false, '31st request should be rate-limited');
assert.ok(blockedCheck.retryAfterSec > 0, 'Retry after seconds should be positive');
console.log('  ✓ TTS sliding-window rate limiter verified (capped at 30 req/min).');

// 4. Live Neural Edge TTS Synthesis (Malayalam & English Female Voices)
console.log('\n[4/4] Testing Live Neural TTS Voice Synthesis...');
(async () => {
  try {
    // Malayalam female voice synthesis
    const malResult = await synthesizeSpeech({
      text: 'നമസ്കാരം, ഞാൻ ഹോപ്പ് ആണ്.',
      language: 'malayalam',
      voice: FEMALE_VOICES.malayalam,
      speed: 1.0,
      clientIp: 'test-ip-1'
    });

    assert.ok(malResult.audioBuffer.length > 5000, 'Malayalam audio buffer should contain valid MP3 data');
    assert.strictEqual(malResult.voice, FEMALE_VOICES.malayalam, 'Should use ml-IN-SobhanaNeural');
    console.log(`  ✓ Malayalam Female Voice (ml-IN-SobhanaNeural): ${malResult.audioBuffer.length} bytes generated.`);

    // Second call should hit cache!
    const malCached = await synthesizeSpeech({
      text: 'നമസ്കാരം, ഞാൻ ഹോപ്പ് ആണ്.',
      language: 'malayalam',
      voice: FEMALE_VOICES.malayalam,
      speed: 1.0,
      clientIp: 'test-ip-1'
    });
    assert.strictEqual(malCached.cached, true, 'Second call with identical parameters should hit cache');
    console.log('  ✓ Audio cache hit verified on repeated synthesis.');

    // English female voice synthesis
    const enResult = await synthesizeSpeech({
      text: 'Hello Alen, I am Hope, your personal companion.',
      language: 'english',
      voice: FEMALE_VOICES.english,
      speed: 1.0,
      clientIp: 'test-ip-2'
    });

    assert.ok(enResult.audioBuffer.length > 5000, 'English audio buffer should contain valid MP3 data');
    assert.strictEqual(enResult.voice, FEMALE_VOICES.english, 'Should use en-IN-NeerjaNeural');
    console.log(`  ✓ English Female Voice (en-IN-NeerjaNeural): ${enResult.audioBuffer.length} bytes generated.`);

    console.log('\n==================================================');
    console.log('🎉 ALL MODULE 3 TESTS PASSED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (err) {
    console.error('Module 3 test failed:', err);
    process.exit(1);
  }
})();

