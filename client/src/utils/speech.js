/**
 * Hope Voice Engine: Web Speech API & Web Audio wrapper.
 * Provides resilient microphone capture, real-time speech recognition,
 * live audio visualizer stream analysis, and soothing vocal playback.
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
      throw new Error('Microphone permission was denied. Please allow microphone access in your browser address bar (lock/camera icon) to talk to Hope.');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('No microphone device was detected on your system. Please plug in a microphone.');
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
 * full transcript accumulation, and intelligent silence finalization.
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
  lang = 'en-US'
} = {}) {
  if (!isSpeechRecognitionSupported()) {
    throw new Error('Speech Recognition is not supported by your current browser. Please try Google Chrome, Microsoft Edge, or a Chromium browser.');
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
    // Ignore benign no-speech or aborted events
    if (event.error === 'no-speech' || event.error === 'aborted') {
      return;
    }

    console.warn('Speech recognition warning:', event.error);
    clearSilence();

    let friendly = `Speech error: ${event.error}`;
    if (event.error === 'not-allowed') {
      friendly = 'Microphone permission denied. Please allow microphone access in your browser.';
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
    // If user spoke something and complete hasn't been fired yet, fire it now
    if (textToSubmit.length > 0 && !hasTriggeredComplete) {
      hasTriggeredComplete = true;
      if (onSpeechComplete) {
        onSpeechComplete(textToSubmit);
      }
    }
    if (onEnd) onEnd();
  };

  return {
    start: () => {
      hasTriggeredComplete = false;
      try {
        recognition.start();
      } catch (err) {
        // Recognition might already be running
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
 * Clean markdown symbols for natural vocal playback
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

  const getBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => 
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')) &&
      v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
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
