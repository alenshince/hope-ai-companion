import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Sparkles, 
  Globe, 
  FileText, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRight,
  ExternalLink,
  BookOpen,
  Compass,
  ChevronDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import SourceCard from './SourceCard';
import SaveToNotesModal from './SaveToNotesModal';
import AudioWaveVisualizer from '../Voice/AudioWaveVisualizer';
import { api } from '../../api';
import { playSuccessDing } from '../../utils/audio';
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  requestMicrophoneAccess,
  createSpeechRecognizer,
  speakText,
  stopSpeaking
} from '../../utils/speech';

export default function ResearchChat({ 
  folders = [], 
  settings = null,
  onNoteCreated, 
  addToast,
  onNavigateToNotes 
}) {
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      role: 'hope',
      text: `### Hello, I'm Hope 🌿
I am here to help you explore complex questions, pull reliable information from across the web, synthesize insights, and archive key discoveries into your notes.

What would you like to research today?`,
      sources: [],
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveWebSearch, setLiveWebSearch] = useState(true);
  const [modalData, setModalData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('');

  const messagesEndRef = useRef(null);
  const recognizerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
      stopSpeaking();
    };
  }, []);

  const samplePrompts = [
    "Hope, who am I and what are my flagship projects?",
    "Brainstorm ideas for our next Hack Till Dawn hackathon at MBCCET",
    "How can we improve offline sync in NerReksha PWA?",
    "Quantum computing fault tolerance and error correction"
  ];

  const handleToggleVoiceInput = async () => {
    if (isListening) {
      if (recognizerRef.current) {
        recognizerRef.current.forceSubmit();
        recognizerRef.current.stop();
        recognizerRef.current = null;
      }
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      if (addToast) addToast({
        type: 'error',
        title: 'Voice Input',
        message: 'Speech recognition is not supported in this browser. Please use Chrome or Edge.'
      });
      return;
    }

    try {
      // Explicitly request microphone stream so browser shows permission prompt
      await requestMicrophoneAccess();

      const recognizer = createSpeechRecognizer({
        continuous: true,
        interimResults: true,
        silenceTimeoutMs: 1800,
        onStart: () => setIsListening(true),
        onResult: ({ final, interim }) => {
          setInput((final + ' ' + interim).trim());
        },
        onSpeechComplete: (completeText) => {
          if (completeText && completeText.trim()) {
            setInput(completeText.trim());
            setIsListening(false);
            handleSend(completeText.trim());
          }
        },
        onError: (err) => {
          console.warn('Voice input error:', err);
          setIsListening(false);
          if (addToast) addToast({
            type: 'error',
            title: 'Microphone Error',
            message: err.friendlyMessage || err.message || 'Could not capture microphone.'
          });
        },
        onEnd: () => setIsListening(false)
      });

      recognizerRef.current = recognizer;
      recognizer.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
      if (addToast) addToast({
        type: 'error',
        title: 'Microphone Access',
        message: err.message || 'Microphone access was denied.'
      });
    }
  };

  const handleSpeakMessage = (msgId, text) => {
    if (speakingMessageId === msgId) {
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);
    speakText(text, {
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null)
    });
  };

  const handleSend = async (queryText) => {
    const query = (queryText || input).trim();
    if (!query || loading) return;

    setInput('');
    const userMsgId = `usr-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    const hopeMsgId = `hope-${Date.now()}`;
    const initialHopeMsg = {
      id: hopeMsgId,
      role: 'hope',
      query,
      text: '',
      sources: [],
      suggestedFollowUps: [],
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg, initialHopeMsg]);
    setLoading(true);
    setThinkingStatus('Hope is analyzing your question...');

    let fullReply = '';

    try {
      const history = messages.slice(-4).map(m => ({ role: m.role, content: m.text }));

      await api.streamChatMessage({
        message: query,
        history,
        languagePreference: settings?.languagePreference || 'auto',
        onStatus: (status) => {
          setThinkingStatus(status);
        },
        onDelta: (delta) => {
          setThinkingStatus('');
          fullReply += delta;
          setMessages(prev => prev.map(m => m.id === hopeMsgId ? { ...m, text: fullReply } : m));
        },
        onDone: (data) => {
          setThinkingStatus('');
          const finalReply = data.reply || fullReply;
          setMessages(prev => prev.map(m => m.id === hopeMsgId ? {
            ...m,
            text: finalReply,
            sources: data.sources || [],
            usedModel: data.usedModel,
            language: data.language
          } : m));

          // If autoSpeak is enabled, read aloud Hope's reply
          if (autoSpeak && finalReply) {
            handleSpeakMessage(hopeMsgId, finalReply);
          }
        },
        onError: (err) => {
          console.warn('Streaming error, falling back to REST endpoint:', err);
          api.sendChatMessage(query, 'chat', history, settings?.languagePreference || 'auto').then(res => {
            setMessages(prev => prev.map(m => m.id === hopeMsgId ? {
              ...m,
              text: res.reply,
              sources: res.sources || [],
              usedModel: res.usedModel,
              language: res.language
            } : m));
          }).catch(restErr => {
            setMessages(prev => prev.map(m => m.id === hopeMsgId ? {
              ...m,
              text: `I encountered an issue gathering findings: ${restErr.message}. Let me know if you would like me to retry.`
            } : m));
          });
        }
      });
    } catch (err) {
      console.error('Research query error:', err);
      setMessages(prev => prev.map(m => m.id === hopeMsgId ? {
        ...m,
        text: `I encountered an issue gathering findings: ${err.message}. Let me know if you would like me to retry or rephrase the question.`
      } : m));
    } finally {
      setLoading(false);
      setThinkingStatus('');
    }
  };

  // One-Click Instant Save to Notes
  const handleQuickSaveToNotes = async (msg) => {
    try {
      const title = msg.query ? `Research: ${msg.query}` : 'Research Synthesis';
      const newNote = await api.createNote({
        title,
        folder: 'Research',
        tags: ['research', 'web-synthesis', 'insights'],
        content: msg.text,
        sources: msg.sources || [],
        summary: `Synthesized research findings for: ${msg.query || title}`
      });

      playSuccessDing();
      if (onNoteCreated) onNoteCreated(newNote);

      if (addToast) {
        addToast({
          type: 'success',
          title: 'Saved to Notebook!',
          message: `"${title}" has been saved in Research folder.`,
          action: {
            label: 'View in Notes →',
            onClick: () => onNavigateToNotes && onNavigateToNotes(newNote.id)
          }
        });
      }
    } catch (err) {
      if (addToast) {
        addToast({
          type: 'error',
          title: 'Save Failed',
          message: err.message
        });
      }
    }
  };

  const handleCopyMarkdown = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg-welcome',
        role: 'hope',
        text: `### Fresh Research Session 🌿\nI'm ready. What topic shall we investigate next?`,
        sources: [],
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50 relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-hope-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl sm:max-w-3xl rounded-2xl p-5 shadow-sm transition-all ${
                  isUser
                    ? 'bg-hope-600 text-white rounded-tr-sm ml-12'
                    : 'bg-white border border-slate-200/80 rounded-tl-sm text-slate-800'
                }`}>
                  {/* Markdown Content */}
                  <div className={isUser ? 'text-white text-sm leading-relaxed' : 'prose-hope text-sm'}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>

                  {/* Sources Citations Section */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-hope-600" />
                          Verified Web Sources ({msg.sources.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Click to inspect original articles
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.sources.map((s, idx) => (
                          <SourceCard key={idx} source={s} index={idx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar for Hope Responses */}
                  {!isUser && msg.id !== 'msg-welcome' && (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {/* 1-Click to Notes Button */}
                        <button
                          onClick={() => handleQuickSaveToNotes(msg)}
                          className="px-3 py-1.5 rounded-lg bg-hope-50 hover:bg-hope-100 text-hope-800 font-semibold border border-hope-200/80 transition-colors flex items-center gap-1.5 shadow-xs"
                          title="Instantly save to your Notes notebook"
                        >
                          <FileText className="w-3.5 h-3.5 text-hope-600" />
                          <span>One-Click to Notes</span>
                        </button>

                        {/* Customize & Save */}
                        <button
                          onClick={() => setModalData(msg)}
                          className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Choose folder and tags before saving"
                        >
                          Customize...
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        {/* Read Aloud Button */}
                        <button
                          onClick={() => handleSpeakMessage(msg.id, msg.text)}
                          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                            speakingMessageId === msg.id
                              ? 'text-indigo-600 bg-indigo-50 font-semibold ring-1 ring-indigo-200'
                              : 'hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title={speakingMessageId === msg.id ? "Stop reading voice" : "Read response aloud"}
                        >
                          {speakingMessageId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                              <span className="text-[11px] text-indigo-600 font-medium">Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Read Aloud</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCopyMarkdown(msg.id, msg.text)}
                          className="p-1.5 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                          title="Copy Markdown"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[11px] text-emerald-600 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Explore Further
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedFollowUps.map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(prompt)}
                            className="text-xs text-left bg-slate-100/90 hover:bg-hope-50 hover:text-hope-700 hover:border-hope-200 border border-slate-200/70 text-slate-700 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                          >
                            <span>{prompt}</span>
                            <ArrowRight className="w-3 h-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Searching Indicator */}
          {loading && thinkingStatus && (
            <div className="flex gap-3.5 justify-start animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-hope-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-hope-200/80 rounded-2xl rounded-tl-sm p-4 shadow-sm text-xs text-hope-900 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-hope-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-hope-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-hope-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="font-medium">
                  {thinkingStatus}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested prompts on initial state */}
      {messages.length === 1 && (
        <div className="max-w-4xl mx-auto px-4 md:px-8 pb-3 w-full">
          <div className="p-3 bg-white/80 backdrop-blur rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 px-1">
              Suggested Explorations
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="text-left text-xs text-slate-700 hover:text-hope-700 bg-slate-50 hover:bg-hope-50/70 p-2.5 rounded-xl border border-slate-200/60 hover:border-hope-200 transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-hope-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-4 bg-white/95 backdrop-blur border-t border-slate-200/80 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Controls Bar */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-500">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={liveWebSearch}
                  onChange={(e) => setLiveWebSearch(e.target.checked)}
                  className="rounded text-hope-600 focus:ring-hope-500 border-slate-300 w-3.5 h-3.5"
                />
                <Globe className={`w-3.5 h-3.5 ${liveWebSearch ? 'text-hope-600' : 'text-slate-400'}`} />
                <span className={liveWebSearch ? 'font-semibold text-hope-800' : 'text-slate-600'}>
                  Live Web Research Mode
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                  className="rounded text-hope-600 focus:ring-hope-500 border-slate-300 w-3.5 h-3.5"
                />
                <Volume2 className={`w-3.5 h-3.5 ${autoSpeak ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={autoSpeak ? 'font-semibold text-indigo-800' : 'text-slate-600'}>
                  Auto-Read Aloud (TTS)
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              {isListening && (
                <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full text-sky-700 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                  <span className="text-[11px] font-medium">Listening to your voice...</span>
                </div>
              )}

              {messages.length > 1 && (
                <button
                  onClick={handleClearChat}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] transition-colors"
                  title="Start a fresh conversation"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear session</span>
                </button>
              )}
            </div>
          </div>

          {/* Text Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? "Listening to your voice... speak now"
                  : liveWebSearch
                  ? "Ask a complex research question to search and synthesize..."
                  : "Talk with Hope (Personalized for Alen)..."
              }
              disabled={loading}
              className={`w-full pl-4 pr-24 py-3 bg-slate-50 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500 transition-all placeholder:text-slate-400 ${
                isListening ? 'border-sky-400 ring-2 ring-sky-200 bg-sky-50/30' : 'border-slate-200'
              }`}
            />

            <div className="absolute right-2 flex items-center gap-1">
              {/* Mic Voice Input Button */}
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`p-2 rounded-xl transition-all ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-2 ring-rose-200 shadow-sm'
                    : 'text-slate-400 hover:text-hope-600 hover:bg-slate-200/60'
                }`}
                title={isListening ? "Stop voice listening" : "Click to speak hands-free"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-hope-600 hover:bg-hope-700 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-all shadow-sm disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Save to Notes Modal */}
      <SaveToNotesModal
        isOpen={Boolean(modalData)}
        onClose={() => setModalData(null)}
        researchData={modalData}
        folders={folders}
        onSaved={(newNote) => {
          playSuccessDing();
          if (onNoteCreated) onNoteCreated(newNote);
          if (addToast) {
            addToast({
              type: 'success',
              title: 'Saved to Notebook!',
              message: `"${newNote.title}" saved in ${newNote.folder}.`,
              action: {
                label: 'View in Notes →',
                onClick: () => onNavigateToNotes && onNavigateToNotes(newNote.id)
              }
            });
          }
        }}
      />
    </div>
  );
}

