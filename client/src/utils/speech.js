/**
 * Hope Voice Engine: Web Speech API & Cloud Neural TTS Wrapper.
 * Provides resilient microphone capture (ml-IN, en-IN), speech recognition,
 * neural female voice playback with automatic browser speech synthesis fallback,
 * live audio visualizer stream analysis, and instant interrupt capability.
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
 * Explicitly requests browser microphone access via getUserMedia.
 * Triggers the browser permission prompt and verifies microphone hardware.
 */
export async function requestMicrophoneAccess() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Your browser does not support media device microphone access.');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    return stream;
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission was denied. Please click the lock or camera icon in your browser address bar and set Microphone to "Allow" to talk with Hope hands-free.');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('No microphone device was detected on your system. Please plug in or connect a microphone.');
    } else {
      throw new Error(`Microphone access error: ${err.message || err.name}`);
    }
  }
}

/**
 * Creates an AudioContext AnalyserNode connected to an active microphone MediaStream.
 * Computes live frequency/volume levels (0 - 100) to animate real acoustic waveforms.
 */
let sharedAudioCtx = null;

export function createAudioLevelMeter(stream, onLevel) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return { disconnect: () => {} };

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContext();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }

    const source = sharedAudioCtx.createMediaStreamSource(stream);
    const analyser = sharedAudioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let isRunning = true;
    let animId;

    const tick = () => {
      if (!isRunning) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const level = Math.min(100, Math.round((avg / 128) * 100));
      if (onLevel) onLevel(level);
      animId = requestAnimationFrame(tick);
    };

    tick();

    return {
      disconnect: () => {
        isRunning = false;
        if (animId) cancelAnimationFrame(animId);
        try {
          source.disconnect();
          analyser.disconnect();
        } catch {
          // ignore
        }
      }
    };
  } catch (err) {
    console.warn('Audio level meter initialization warning:', err);
    return { disconnect: () => {} };
  }
}

/**
 * Creates a robust Speech Recognition controller with continuous listening,
 * full transcript accumulation, language selection (ml-IN / en-IN), and silence finalization.
 */
export function createSpeechRecognizer({
  onResult,
  onSpeechComplete,
  onError,
  onStart,
  onEnd,
  continuous = true,
  interimResults = true,
  silenceTimeoutMs = 1800,
  lang = 'en-IN' // Supports 'en-IN' and 'ml-IN'
} = {}) {
  if (!isSpeechRecognitionSupported()) {
    throw new Error('Speech Recognition is not supported by your current browser. Please try Google Chrome or Microsoft Edge.');
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  let silenceTimer = null;
  let fullAccumulated = '';
  let currentInterim = '';
  let hasTriggeredComplete = false;

  const clearSilence = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  const scheduleComplete = () => {
    clearSilence();
    if (silenceTimeoutMs > 0) {
      silenceTimer = setTimeout(() => {
        const textToSubmit = (fullAccumulated + ' ' + currentInterim).trim();
        if (textToSubmit.length > 0 && !hasTriggeredComplete) {
          hasTriggeredComplete = true;
          if (onSpeechComplete) {
            onSpeechComplete(textToSubmit);
          }
        }
      }, silenceTimeoutMs);
    }
  };

  recognition.onstart = () => {
    fullAccumulated = '';
    currentInterim = '';
    hasTriggeredComplete = false;
    clearSilence();
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let finalStr = '';
    let interimStr = '';

    for (let i = 0; i < event.results.length; ++i) {
      const result = event.results[i];
      if (result.isFinal) {
        finalStr += result[0].transcript + ' ';
      } else {
        interimStr += result[0].transcript;
      }
    }

    fullAccumulated = finalStr.trim();
    currentInterim = interimStr.trim();
    const liveDisplay = (fullAccumulated + ' ' + currentInterim).trim();

    if (onResult) {
      onResult({
        final: fullAccumulated,
        interim: currentInterim,
        full: liveDisplay
      });
    }

    // Reset silence timer whenever user speaks new speech
    if (liveDisplay.length > 0) {
      scheduleComplete();
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }

    console.warn('Speech recognition warning:', event.error);
    clearSilence();

    let friendly = `Speech error: ${event.error}`;
    if (event.error === 'not-allowed') {
      friendly = 'Microphone permission denied. Please allow microphone access in your browser address bar.';
    } else if (event.error === 'network') {
      friendly = 'Speech recognition network connection interrupted. Please try again.';
    } else if (event.error === 'audio-capture') {
      friendly = 'No microphone audio was detected. Please check your mic connection.';
    }

    if (onError) onError({ ...event, friendlyMessage: friendly });
  };

  recognition.onend = () => {
    clearSilence();
    const textToSubmit = (fullAccumulated + ' ' + currentInterim).trim();
    if (textToSubmit.length > 0 && !hasTriggeredComplete) {
      hasTriggeredComplete = true;
      if (onSpeechComplete) {
        onSpeechComplete(textToSubmit);
      }
    }
    if (onEnd) onEnd();
  };

  return {
    setLanguage: (newLang) => {
      recognition.lang = newLang;
    },
    start: () => {
      hasTriggeredComplete = false;
      try {
        recognition.start();
      } catch (err) {
        if (err.name !== 'InvalidStateError') {
          throw err;
        }
      }
    },
    stop: () => {
      clearSilence();
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
    abort: () => {
      clearSilence();
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    },
    forceSubmit: () => {
      clearSilence();
      const textToSubmit = (fullAccumulated + ' ' + currentInterim).trim();
      if (textToSubmit.length > 0 && !hasTriggeredComplete) {
        hasTriggeredComplete = true;
        if (onSpeechComplete) {
          onSpeechComplete(textToSubmit);
        }
      }
    },
    raw: recognition
  };
}

/**
 * Clean markdown symbols for natural vocal playback fallback
 */
export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/[^\s)]+/g, '')
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
 * Active playback tracking for immediate interruption
 */
let activeAudioElement = null;
let activeUtterance = null;
let activeAudioBlobUrl = null;
let currentSpeakingRate = 1.0;

export function setPlaybackSpeed(rate) {
  currentSpeakingRate = Number(rate) || 1.0;
  if (activeAudioElement) {
    activeAudioElement.playbackRate = currentSpeakingRate;
  }
}

export function getPlaybackSpeed() {
  return currentSpeakingRate;
}

/**
 * Immediately halts any currently playing audio or browser utterance.
 */
export function stopSpeaking() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  if (activeAudioBlobUrl) {
    URL.revokeObjectURL(activeAudioBlobUrl);
    activeAudioBlobUrl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
}

export function isSpeaking() {
  const isAudioPlaying = activeAudioElement && !activeAudioElement.paused && !activeAudioElement.ended;
  const isSynthSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  return Boolean(isAudioPlaying || isSynthSpeaking);
}

/**
 * Fallback to browser SpeechSynthesis API
 */
function speakViaWebSpeech(rawText, { onStart, onEnd, onError, rate = 1.0 } = {}) {
  if (!isSpeechSynthesisSupported()) {
    console.warn('SpeechSynthesis is not supported.');
    if (onEnd) onEnd();
    return null;
  }

  const clean = cleanTextForSpeech(rawText);
  if (!clean) {
    if (onEnd) onEnd();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const isMalayalam = /[\u0D00-\u0D7F]/.test(clean);

  const getBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (isMalayalam) {
      const mlVoice = voices.find(v => v.lang.startsWith('ml') || v.name.toLowerCase().includes('malayalam'));
      if (mlVoice) return mlVoice;
    }
    // Search for Indian English or natural female voice
    return voices.find(v => v.lang === 'en-IN') ||
           voices.find(v => (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Samantha') || v.name.includes('Google')) && v.lang.startsWith('en')) ||
           voices.find(v => v.lang.startsWith('en')) ||
           voices[0];
  };

  const voice = getBestVoice();
  if (voice) utterance.voice = voice;

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

/**
 * Speaks text using Hope Neural Cloud Voice (Edge TTS with ml-IN-SobhanaNeural & en-IN-NeerjaNeural)
 * with graceful fallback to browser Web Speech API.
 */
export async function speakText(rawText, {
  onStart,
  onEnd,
  onError,
  rate = currentSpeakingRate,
  language = 'auto'
} = {}) {
  // 1. Immediately cancel any ongoing speech
  stopSpeaking();

  if (!rawText || !rawText.trim()) {
    if (onEnd) onEnd();
    return;
  }

  // 2. Try primary neural cloud voice endpoint (/api/voice/tts)
  try {
    const res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: rawText,
        language,
        speed: rate
      })
    });

    if (!res.ok) {
      throw new Error(`Cloud TTS returned status ${res.status}`);
    }

    const audioBlob = await res.blob();
    const blobUrl = URL.createObjectURL(audioBlob);
    activeAudioBlobUrl = blobUrl;

    const audio = new Audio(blobUrl);
    audio.playbackRate = rate;
    activeAudioElement = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      stopSpeaking();
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error, falling back to Web Speech API:', e);
      stopSpeaking();
      speakViaWebSpeech(rawText, { onStart, onEnd, onError, rate });
    };

    await audio.play();
    return audio;
  } catch (err) {
    console.warn('Neural TTS failed, falling back to Web Speech API:', err.message);
    return speakViaWebSpeech(rawText, { onStart, onEnd, onError, rate });
  }
}
