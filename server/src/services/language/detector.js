/**
 * Bilingual Language & Script Detector
 * Classifies text into: 'malayalam' (Unicode script), 'manglish' (Malayalam in Latin script),
 * 'english', or 'mixed' (code-switching).
 */

// Common spoken Manglish vocabulary markers
const MANGLISH_DICTIONARY = new Set([
  'enthokke', 'vishesham', 'visheshangal', 'sukhamaano', 'sukhamano', 'sukham',
  'kazhicho', 'kazhichu', 'kudicho', 'chaaya', 'kaapi', 'oottu', 'bhakshanam',
  'nalla', 'pakshe', 'ippol', 'ivide', 'evide', 'entha', 'enthanu', 'aano',
  'alla', 'undu', 'illa', 'illathe', 'shari', 'kuzhappamilla', 'kuzhappam',
  'namukku', 'njan', 'njaan', 'nammal', 'ningal', 'chechi', 'chetta', 'mone',
  'molu', 'pinne', 'innu', 'naale', 'nokkam', 'nokkaam', 'parayoo', 'parayam',
  'koodi', 'matte', 'engane', 'enganeyundu', 'ariyilla', 'ariyo', 'manasilayi',
  'manasilaayo', 'aarumilla', 'namaskaram', 'athe', 'valare', 'aanu', 'aayirunnu',
  'varum', 'poyi', 'padikkunnu', 'nannayi', 'saramilla', 'pedikenda', 'santhosham',
  'sneham', 'snehathode', 'kollam', 'adipoli', 'pwoli', 'oru', 'ithu', 'athu',
  'enthada', 'ente', 'ninakk', 'enikku', 'venam', 'venda', 'nanni', 'dhanyavadham',
  'tto', 'dho', 'ketto', 'ketta'
]);

/**
 * Detects whether a string contains Malayalam Unicode characters (\u0D00 - \u0D7F).
 */
export function hasMalayalamScript(text) {
  return /[\u0D00-\u0D7F]/.test(text);
}

/**
 * Detects whether text matches Manglish phonetic words.
 */
export function countManglishTokens(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  let manglishCount = 0;
  for (const word of words) {
    if (MANGLISH_DICTIONARY.has(word)) {
      manglishCount++;
    } else {
      // Check common Manglish suffix patterns (e.g. -aano, -undu, -illa, -aayi, -ukayanu)
      if (/(aano|undu|illa|aayi|ukayanu|anallo|aarnnu|enkil)$/.test(word) && word.length > 5) {
        manglishCount++;
      }
    }
  }
  return { manglishCount, totalWords: words.length };
}

/**
 * Classifies language mode of the user prompt and matches target response style.
 * @param {string} text
 * @param {'auto'|'malayalam'|'english'|'mixed'} [preference='auto']
 * @returns {{ detected: 'malayalam'|'manglish'|'english'|'mixed', targetReplyLanguage: 'malayalam'|'manglish'|'english'|'mixed', script: 'malayalam'|'latin'|'mixed', confidence: number }}
 */
export function detectLanguage(text, preference = 'auto') {
  if (!text || typeof text !== 'string') {
    return { detected: 'english', targetReplyLanguage: preference !== 'auto' ? preference : 'english', script: 'latin', confidence: 1 };
  }

  const clean = text.trim();
  const malayalamCharCount = (clean.match(/[\u0D00-\u0D7F]/g) || []).length;
  const englishCharCount = (clean.match(/[a-zA-Z]/g) || []).length;
  const totalLetters = malayalamCharCount + englishCharCount;

  const { manglishCount, totalWords } = countManglishTokens(clean);

  let detected = 'english';
  let script = 'latin';

  if (malayalamCharCount > 0 && englishCharCount > 0) {
    detected = 'mixed';
    script = 'mixed';
  } else if (malayalamCharCount > 0 && (malayalamCharCount / Math.max(1, totalLetters)) > 0.4) {
    detected = 'malayalam';
    script = 'malayalam';
  } else if (manglishCount >= 1 || (totalWords > 0 && manglishCount / totalWords >= 0.2)) {
    detected = totalWords > manglishCount + 2 ? 'mixed' : 'manglish';
    script = 'latin';
  } else {
    detected = 'english';
    script = 'latin';
  }

  // Determine target language for Hope's reply based on user settings
  let targetReplyLanguage = detected;
  if (preference === 'malayalam') {
    targetReplyLanguage = 'malayalam';
  } else if (preference === 'english') {
    targetReplyLanguage = 'english';
  } else if (preference === 'mixed') {
    targetReplyLanguage = 'mixed';
  }

  return {
    detected,
    targetReplyLanguage,
    script,
    manglishTokens: manglishCount,
    confidence: detected === 'malayalam' || detected === 'english' ? 0.95 : 0.85
  };
}

