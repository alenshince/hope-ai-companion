/**
 * Text Pre-processor for Speech Synthesis (TTS)
 * Generates natural spoken versions of text:
 * - Strips markdown syntax, code blocks, bullet markers, and headers
 * - Strips raw URLs and emojis
 * - Converts common Manglish vocabulary into Malayalam Unicode script so neural TTS pronounces it naturally
 * - Splits into clear spoken sentences
 */

// Common Manglish phonetic to Malayalam script mappings for TTS pronunciation
const MANGLISH_TO_MALAYALAM = {
  'namaskaram': 'നമസ്കാരം',
  'enthokke': 'എന്തൊക്കെ',
  'vishesham': 'വിശേഷം',
  'visheshangal': 'വിശേഷങ്ങൾ',
  'sukhamaano': 'സുഖമാണോ',
  'sukhamano': 'സുഖമാണോ',
  'sukham': 'സുഖം',
  'kazhicho': 'കഴിച്ചോ',
  'kazhichu': 'കഴിച്ചു',
  'kudicho': 'കുടിച്ചോ',
  'chaaya': 'ചായ',
  'kaapi': 'കാപ്പി',
  'bhakshanam': 'ഭക്ഷണം',
  'oottu': 'ഊണ്',
  'nalla': 'നല്ല',
  'pakshe': 'പക്ഷേ',
  'ippol': 'ഇപ്പോൾ',
  'ivide': 'ഇവിടെ',
  'evide': 'എവിടെ',
  'entha': 'എന്താ',
  'enthanu': 'എന്താണ്',
  'aano': 'ആണോ',
  'alla': 'അല്ല',
  'undu': 'ഉണ്ട്',
  'illa': 'ഇല്ല',
  'shari': 'ശരി',
  'kuzhappamilla': 'കുഴപ്പമില്ല',
  'kuzhappam': 'കുഴപ്പം',
  'namukku': 'നമുക്ക്',
  'njan': 'ഞാൻ',
  'njaan': 'ഞാൻ',
  'nammal': 'നമ്മൾ',
  'ningal': 'നിങ്ങൾ',
  'chechi': 'ചേച്ചി',
  'chetta': 'ചേട്ടാ',
  'mone': 'മോനേ',
  'molu': 'മോളൂ',
  'pinne': 'പിന്നെ',
  'innu': 'ഇന്ന്',
  'naale': 'നാളെ',
  'nokkam': 'നോക്കാം',
  'nokkaam': 'നോക്കാം',
  'parayoo': 'പറയൂ',
  'parayam': 'പറയാം',
  'koodi': 'കൂടി',
  'matte': 'മറ്റേ',
  'engane': 'എങ്ങനെ',
  'enganeyundu': 'എങ്ങനെയുണ്ട്',
  'ariyilla': 'അറിയില്ല',
  'ariyo': 'അറിയോ',
  'manasilayi': 'മനസ്സിലായി',
  'manasilaayo': 'മനസ്സിലായോ',
  'aarumilla': 'ആരുമില്ല',
  'athe': 'അതെ',
  'valare': 'വളരെ',
  'aanu': 'ആണ്',
  'aayirunnu': 'ആയിരുന്നു',
  'varum': 'വരും',
  'poyi': 'പോയി',
  'padikkunnu': 'പഠിക്കുന്നു',
  'nannayi': 'നന്നായി',
  'saramilla': 'സാരമില്ല',
  'pedikenda': 'പേടിക്കേണ്ട',
  'santhosham': 'സന്തോഷം',
  'sneham': 'സ്നേഹം',
  'snehathode': 'സ്നേഹത്തോടെ',
  'kollam': 'കൊള്ളാം',
  'adipoli': 'അടിപൊളി',
  'pwoli': 'പൊളി',
  'oru': 'ഒരു',
  'ithu': 'ഇത്',
  'athu': 'അത്',
  'ente': 'എന്റെ',
  'ninakk': 'നിനക്ക്',
  'enikku': 'എനിക്ക്',
  'venam': 'വേണം',
  'venda': 'വേണ്ട',
  'nanni': 'നന്ദി',
  'tto': 'ട്ടോ',
  'ketto': 'കേട്ടോ',
  'ketta': 'കേട്ടാ'
};

/**
 * Strips markdown code blocks, inline code, bold/italic, images, links, blockquotes, and headers.
 */
export function stripMarkdown(text) {
  if (!text) return '';

  return text
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    // Remove links [text](url) -> keep text only
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/[^\s)]+/g, '')
    // Remove headers (# Header)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italics (**text**, *text*, __text__, _text_)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Remove blockquotes (> quote)
    .replace(/^\s*>\s+/gm, '')
    // Remove list markers (- item, * item, 1. item)
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove horizontal rules (---, ***)
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse multiple spaces/newlines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Removes emojis and decorative symbols that sound awkward when read aloud by TTS.
 */
export function stripEmojis(text) {
  if (!text) return '';
  // Comprehensive emoji regex matching pictographs, emoticons, dingbats, and transport symbols
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts known Manglish words to Malayalam Unicode script for accurate neural pronunciation.
 */
export function convertManglishToScript(text) {
  if (!text) return '';

  return text.replace(/\b[a-zA-Z]+\b/g, (match) => {
    const lower = match.toLowerCase();
    if (MANGLISH_TO_MALAYALAM[lower]) {
      return MANGLISH_TO_MALAYALAM[lower];
    }
    return match;
  });
}

/**
 * Splits spoken text into manageable sentence chunks (at punctuation or natural breaks).
 */
export function splitIntoSentences(text) {
  if (!text) return [];

  // Split on sentence terminators (. ! ? \n and Malayalam danda)
  const sentences = text
    .split(/(?<=[.!?\n।])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return sentences;
}

/**
 * Prepares the final clean, spoken version of text for Text-to-Speech synthesis.
 * @param {string} rawText
 * @param {'auto'|'malayalam'|'english'|'mixed'} [language='auto']
 * @returns {{ spokenText: string, sentences: string[], isMalayalam: boolean }}
 */
export function prepareSpokenVersion(rawText, language = 'auto') {
  if (!rawText) {
    return { spokenText: '', sentences: [], isMalayalam: false };
  }

  // 1. Strip markdown formatting
  let clean = stripMarkdown(rawText);

  // 2. Strip emojis and non-speech symbols
  clean = stripEmojis(clean);

  // 3. Detect if Malayalam or Manglish
  const hasMalScript = /[\u0D00-\u0D7F]/.test(clean);
  const shouldConvertManglish = language === 'malayalam' || language === 'mixed' || (!hasMalScript && language === 'auto');

  if (shouldConvertManglish) {
    clean = convertManglishToScript(clean);
  }

  // 4. Clean up any leftover awkward punctuation
  clean = clean
    .replace(/[\[\](){}<>\\/|]/g, ' ')
    .replace(/\s*([,.:;?!])\s*/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 5. Split into sentences
  const sentences = splitIntoSentences(clean);
  const isMalayalam = /[\u0D00-\u0D7F]/.test(clean);

  return {
    spokenText: clean,
    sentences,
    isMalayalam
  };
}

