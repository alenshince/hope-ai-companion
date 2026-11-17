import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Calendar,
  FileText,
  Activity,
  User,
  Radio,
  Send,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import AudioWaveVisualizer from './AudioWaveVisualizer';
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  requestMicrophoneAccess,
  createAudioLevelMeter,
  createSpeechRecognizer,
  speakText,
  stopSpeaking,
  setPlaybackSpeed,
  getPlaybackSpeed
} from '../../utils/speech';
import { api } from '../../api';

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  onReminderCreated,
  onNoteCreated,
  onWellnessLogged,
  addToast
}) {
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [hopeResponse, setHopeResponse] = useState(null);
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [sttLanguage, setSttLanguage] = useState('en-IN'); // 'en-IN' | 'ml-IN'
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0); // 0.75 | 1.0 | 1.25
  const [errorMessage, setErrorMessage] = useState('');
  const [liveLevel, setLiveLevel] = useState(0);
  const [hasMicPermission, setHasMicPermission] = useState(null);

  const recognizerRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioMeterRef = useRef(null);
  const isListeningRef = useRef(false);
  const handsFreeRef = useRef(handsFreeMode);
  handsFreeRef.current = handsFreeMode;
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      handleStopListening();
      stopSpeaking();
      setVoiceState('idle');
      setTranscript('');
      setInterimText('');
      setErrorMessage('');
      setLiveLevel(0);
    }
    return () => {
      handleStopListening();
      stopSpeaking();
    };
  }, [isOpen]);

  const handleStartListening = async () => {
    stopSpeaking();
    setErrorMessage('');
    setTranscript('');
    setInterimText('');

    if (!isSpeechRecognitionSupported()) {
      setErrorMessage(
        'Speech Recognition is not supported by your current browser. For native voice recognition, please open Hope in Google Chrome or Microsoft Edge.'
      );
      return;
    }

    try {
      // Step 1: Explicitly request browser microphone access
      // This forces the browser to prompt the user and verifies mic hardware
      const stream = await requestMicrophoneAccess();
      micStreamRef.current = stream;
      setHasMicPermission(true);

      // Step 2: Connect real-time audio analyser to mic stream
      if (audioMeterRef.current) {
        audioMeterRef.current.disconnect();
      }
      audioMeterRef.current = createAudioLevelMeter(stream, (level) => {
        setLiveLevel(level);
      });

      // Step 3: Initialize Speech Recognizer with continuous listening & silence finalization
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }

      const recognizer = createSpeechRecognizer({
        continuous: true,
        interimResults: true,
        silenceTimeoutMs: 1800,
        lang: sttLanguage,
        onStart: () => {
          isListeningRef.current = true;
          setVoiceState('listening');
        },
        onResult: ({ final, interim }) => {
          setTranscript(final);
          setInterimText(interim);
        },
        onSpeechComplete: (finalSpokenText) => {
          if (finalSpokenText && finalSpokenText.trim()) {
            handleProcessCommand(finalSpokenText.trim());
          }
        },
        onError: (err) => {
          console.warn('Voice recognition error:', err);
          isListeningRef.current = false;
          setVoiceState('idle');
          setErrorMessage(err.friendlyMessage || 'Microphone error occurred.');
        },
        onEnd: () => {
          isListeningRef.current = false;
          if (voiceState === 'listening') {
            setVoiceState('idle');
          }
        }
      });

      recognizerRef.current = recognizer;
      recognizer.start();
    } catch (err) {
      console.warn('Microphone start error:', err);
      setHasMicPermission(false);
      setErrorMessage(err.message || 'Could not access microphone.');
      setVoiceState('idle');
    }
  };

  const handleStopListening = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    if (audioMeterRef.current) {
      audioMeterRef.current.disconnect();
      audioMeterRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    isListeningRef.current = false;
    setLiveLevel(0);
    if (voiceState === 'listening') {
      setVoiceState('idle');
    }
  };

  const handleProcessCommand = async (spokenText) => {
    if (!spokenText.trim()) return;

    handleStopListening();
    setVoiceState('processing');

    try {
      const res = await api.sendVoiceCommand(spokenText);
      setHopeResponse(res);

      // Trigger app notifications or callbacks based on intent
      if (res.intent === 'reminder' && onReminderCreated && res.data) {
        onReminderCreated(res.data);
        if (addToast) addToast({ type: 'success', title: 'Reminder Scheduled', message: res.data.title });
      } else if (res.intent === 'note' && onNoteCreated && res.data) {
        onNoteCreated(res.data);
        if (addToast) addToast({ type: 'success', title: 'Note Saved', message: res.data.title });
      } else if (res.intent === 'wellness' && onWellnessLogged) {
        onWellnessLogged();
        if (addToast) addToast({ type: 'hope', title: 'Health Logged', message: res.reply });
      }

      // Read aloud via Neural TTS with female voice (ml-IN-SobhanaNeural / en-IN-NeerjaNeural)
      if (autoSpeakRef.current && res.spokenText) {
        setVoiceState('speaking');
        speakText(res.spokenText, {
          rate: playbackSpeed,
          language: sttLanguage === 'ml-IN' ? 'malayalam' : 'auto',
          onStart: () => setVoiceState('speaking'),
          onEnd: () => {
            setVoiceState('idle');
            // If hands-free mode is on, auto-listen for next user input!
            if (handsFreeRef.current && isOpen) {
              setTimeout(() => {
                if (isOpen) handleStartListening();
              }, 800);
            }
          },
          onError: () => setVoiceState('idle')
        });
      } else {
        setVoiceState('idle');
      }
    } catch (err) {
      console.error('Voice command execution failed:', err);
      setErrorMessage('Failed to process command. Please try again.');
      setVoiceState('idle');
    }
  };

  const handleManualSubmit = () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (fullText) {
      handleProcessCommand(fullText);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setTranscript(promptText);
    handleProcessCommand(promptText);
  };

  const sampleVoiceCommands = [
    { label: "Remind me to submit Flutter UI tomorrow at 4 PM", icon: Calendar },
    { label: "Hope, who am I and what are my projects?", icon: User },
    { label: "Search for latest WebGPU features in Flutter", icon: Sparkles },
    { label: "Take a note about Hack Till Dawn event ideas", icon: FileText },
    { label: "Log 1 glass of water", icon: Activity },
    { label: "How is my wellness today?", icon: Activity }
  ];

  if (!isOpen) return null;

  const currentDisplaySpeech = (transcript + ' ' + interimText).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-hope-50/70 via-white to-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-hope-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-hope-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Hope Voice Assistant</h3>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Hands-Free Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">Natural voice commands & personal context</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Audio Wave & Interaction Area */}
        <div className="p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 border-b border-slate-100">
          {/* Dynamic Waveform Visualizer connected to real mic level */}
          <div className="my-2">
            <AudioWaveVisualizer state={voiceState} size="lg" liveLevel={liveLevel} />
          </div>

          {/* Real-time Mic Activity Meter */}
          {voiceState === 'listening' && (
            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Mic Input:
              </span>
              <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-500 transition-all duration-75 rounded-full"
                  style={{ width: `${Math.max(5, liveLevel)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500">{liveLevel}%</span>
            </div>
          )}

          {/* Transcript / Listening State Preview */}
          <div className="mt-2 min-h-[48px] flex items-center justify-center px-4 w-full">
            {voiceState === 'listening' ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {currentDisplaySpeech || (
                    <span className="text-slate-400 italic">
                      Listening to your voice... Speak now (e.g., "Hey Hope, remind me to...")
                    </span>
                  )}
                </p>
                {currentDisplaySpeech && (
                  <p className="text-[11px] text-hope-600 font-medium animate-pulse">
                    Pause for 1.5s to submit, or click Submit below
                  </p>
                )}
              </div>
            ) : voiceState === 'processing' ? (
              <p className="text-sm text-hope-600 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-hope-500 animate-ping" />
                Synthesizing response and executing command...
              </p>
            ) : voiceState === 'speaking' ? (
              <p className="text-sm text-indigo-600 font-medium flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 animate-bounce" />
                Reading response aloud...
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Click <strong>"Start Talking"</strong> below to activate your microphone.
              </p>
            )}
          </div>

          {/* Error Message with Permission Guidance */}
          {errorMessage && (
            <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200/80 px-3.5 py-2 rounded-2xl flex items-start gap-2 text-left max-w-md">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Microphone issue detected</p>
                <p className="text-[11px] text-rose-600 mt-0.5">{errorMessage}</p>
                {errorMessage.includes('permission') && (
                  <p className="text-[10px] text-slate-600 mt-1">
                    👉 Click the <strong>lock / tune icon</strong> in your browser address bar and set <strong>Microphone: Allow</strong>, then refresh.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                if (voiceState === 'listening') {
                  handleStopListening();
                } else {
                  handleStartListening();
                }
              }}
              className={`px-5 py-3.5 rounded-2xl flex items-center gap-2.5 font-bold text-sm transition-all shadow-md ${
                voiceState === 'listening'
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 ring-4 ring-rose-100 animate-pulse'
                  : 'bg-gradient-to-r from-hope-500 to-indigo-600 hover:from-hope-600 hover:to-indigo-700 text-white shadow-hope-500/25 ring-4 ring-hope-100'
              }`}
            >
              {voiceState === 'listening' ? (
                <>
                  <MicOff className="w-5 h-5" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span>Start Talking (Speak to Hope)</span>
                </>
              )}
            </button>

            {/* Quick Submit Button when words are captured */}
            {voiceState === 'listening' && currentDisplaySpeech && (
              <button
                onClick={handleManualSubmit}
                className="px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                title="Send current spoken command immediately"
              >
                <Send className="w-4 h-4" />
                <span>Submit Now</span>
              </button>
            )}

            {voiceState === 'speaking' && (
              <button
                onClick={() => {
                  stopSpeaking();
                  setVoiceState('idle');
                }}
                className="p-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                title="Silence Hope's voice"
              >
                <VolumeX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Hope's Response Card (if present) */}
        {hopeResponse && (
          <div className="p-5 max-h-56 overflow-y-auto border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-hope-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Hope's Response
              </span>
              <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">
                Intent: {hopeResponse.intent || 'conversation'}
              </span>
            </div>

            <div className="prose prose-sm prose-slate max-w-none text-xs leading-relaxed text-slate-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {hopeResponse.reply}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Quick Voice Suggestion Chips */}
        <div className="p-4 bg-slate-50/70 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            <span>Or Tap a Sample Voice Command:</span>
            <span className="text-[10px] text-hope-600 font-normal">Click to trigger</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sampleVoiceCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(cmd.label)}
                  className="flex items-center gap-2 p-2 rounded-xl text-left bg-white hover:bg-hope-50/80 border border-slate-200/80 hover:border-hope-300 transition-all text-xs text-slate-700 group"
                >
                  <Icon className="w-3.5 h-3.5 text-hope-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate">{cmd.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language & Voice Controls Bar */}
        <div className="px-6 py-2.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">Mic Lang:</span>
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setSttLanguage('en-IN');
                  if (recognizerRef.current) recognizerRef.current.setLanguage('en-IN');
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  sttLanguage === 'en-IN' ? 'bg-white text-hope-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English (en-IN)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSttLanguage('ml-IN');
                  if (recognizerRef.current) recognizerRef.current.setLanguage('ml-IN');
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  sttLanguage === 'ml-IN' ? 'bg-white text-hope-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                മലയാളം (ml-IN)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">Voice Speed:</span>
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px]">
              {[0.75, 1.0, 1.25].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => {
                    setPlaybackSpeedState(speed);
                    setPlaybackSpeed(speed);
                  }}
                  className={`px-2 py-0.5 rounded font-mono font-medium transition-all ${
                    playbackSpeed === speed ? 'bg-white text-hope-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Controls: Hands-Free & Auto-Speak toggles */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={handsFreeMode}
              onChange={(e) => setHandsFreeMode(e.target.checked)}
              className="rounded text-hope-600 focus:ring-hope-500 border-slate-300 w-3.5 h-3.5"
            />
            <span className="font-medium">Continuous Hands-Free Mode</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded text-hope-600 focus:ring-hope-500 border-slate-300 w-3.5 h-3.5"
            />
            <span className="font-medium">Read Aloud (TTS)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
