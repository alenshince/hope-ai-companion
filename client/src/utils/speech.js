/**
 * Hope Voice Engine: Web Speech API wrapper for SpeechRecognition & SpeechSynthesis.
 * Supports real-time hands-free conversation with calming vocal playback.
 */

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean('speechSynthesis' in window && window.SpeechSynthesisUtterance);
}

/**
 * Creates an active speech recognition instance with friendly event hooks.
 */
export function createSpeechRecognizer({
  onResult,
  onError,
  onStart,
  onEnd,
  continuous = false,
  interimResults = true,
  lang = 'en-US'
} = {}) {
  if (!isSpeechRecognitionSupported()) {
    throw new Error('Speech Recognition is not supported by your current browser.');
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (onResult) {
      onResult({
        final: finalTranscript.trim(),
        interim: interimTranscript.trim(),
        full: (finalTranscript + ' ' + interimTranscript).trim()
      });
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition event error:', event.error);
    if (onError) onError(event);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}

/**
 * Clean markdown symbols for natural TTS speech output
 */
export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/>\s+/g, '')
    .replace(/[-*+]\s+\[[ x]\]\s+/gi, 'Checklist item: ')
    .replace(/[-*+]\s+/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Speaks text using SpeechSynthesis with warm, calming cadence.
 */
let activeUtterance = null;

export function speakText(rawText, {
  onStart,
  onEnd,
  onError,
  rate = 0.95,
  pitch = 1.0,
  volume = 1.0
} = {}) {
  if (!isSpeechSynthesisSupported()) {
    console.warn('SpeechSynthesis is not supported.');
    return null;
  }

  // Cancel prior speech
  stopSpeaking();

  const clean = cleanTextForSpeech(rawText);
  if (!clean) return null;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  // Select the highest quality natural English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')) &&
    v.lang.startsWith('en')
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    activeUtterance = utterance;
    if (onStart) onStart();
  };

  utterance.onend = () => {
    activeUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    activeUtterance = null;
    if (onError) onError(e);
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
}

export function isSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}

