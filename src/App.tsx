import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ArrowLeftRight, 
  Volume2, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Loader2, 
  Trash2, 
  History, 
  Languages,
  BookOpen,
  Send,
  HelpCircle,
  FileText,
  VolumeX,
  Plus
} from 'lucide-react';

interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  tone: string;
  timestamp: string;
}

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Chinese (Simplified)',
  'Korean',
  'Arabic',
  'Hindi',
  'Urdu',
  'Russian',
  'Turkish',
  'Vietnamese'
];

const TONES = [
  { value: 'Professional/Academic', label: 'Professional / Academic', icon: '🎓' },
  { value: 'Casual/Conversational', label: 'Casual / Natural', icon: '💬' },
  { value: 'Business/Diplomatic', label: 'Business / Diplomatic', icon: '💼' },
  { value: 'Creative/Poetic', label: 'Creative / Expressive', icon: '✨' },
  { value: 'Polite/Humble', label: 'Polite / Respectful', icon: '🙏' }
];

const MODELS = [
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', desc: 'Fast, intelligent default' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', desc: 'Sleek, low latency model' }
];

export default function App() {
  const [inputText, setInputText] = useState<string>('The implementation of artificial intelligence in cross-cultural communication bridges the gap between disparate linguistic frameworks, ensuring semantic precision in real-time.');
  const [translatedText, setTranslatedText] = useState<string>('異文化コミュニケーションへの人工知能の実装は、異なる言語フレームワーク間のギャップを埋め、リアルタイムで意味の正確さを保証します。');
  
  const [sourceLang, setSourceLang] = useState<string>('Auto-Detect');
  const [targetLang, setTargetLang] = useState<string>('Japanese');
  const [detectedLang, setDetectedLang] = useState<string>('English');
  const [contextTone, setContextTone] = useState<string>('Professional/Academic');
  const [aiModel, setAiModel] = useState<string>('gemini-3.5-flash');

  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [ttsPlaying, setTtsPlaying] = useState<boolean>(false);
  
  // Clipboard copied status
  const [copiedInput, setCopiedInput] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);

  // UI Panels
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Custom Toasts
  const [toasts, setToasts] = useState<{ id: string; text: string; type: 'success' | 'info' | 'error' | 'warning' }[]>([]);

  // Refs for tracking TTS audio play
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lingo_ai_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // Sync history to localStorage
  const saveToHistory = (source: string, result: string, sLang: string, tLang: string, toneStyle: string) => {
    if (!source.trim()) return;
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      sourceText: source.trim(),
      translatedText: result.trim(),
      sourceLang: sLang,
      targetLang: tLang,
      tone: toneStyle,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [newItem, ...history.slice(0, 19)]; // limit to 20 items
    setHistory(updated);
    try {
      localStorage.setItem('lingo_ai_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('lingo_ai_history');
      showToast('Translation history cleared', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  // Toast helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Auto-detect input language if "Auto-Detect" selected and text length > 12 characters
  const detectLanguageDebounced = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (sourceLang !== 'Auto-Detect' || !inputText.trim() || inputText.length < 10) {
      return;
    }

    if (detectLanguageDebounced.current) {
      clearTimeout(detectLanguageDebounced.current);
    }

    detectLanguageDebounced.current = setTimeout(async () => {
      setIsDetecting(true);
      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText }),
        });
        const data = await res.json();
        if (data.language && data.language !== 'Failed') {
          setDetectedLang(data.language);
        }
      } catch (err) {
        console.error('Error detecting language', err);
      } finally {
        setIsDetecting(false);
      }
    }, 1500);

    return () => {
      if (detectLanguageDebounced.current) {
        clearTimeout(detectLanguageDebounced.current);
      }
    };
  }, [inputText, sourceLang]);

  // Main Translation function
  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) {
      showToast('Please type some text to translate', 'warning');
      return;
    }

    setIsTranslating(true);
    const resolvedSource = sourceLang === 'Auto-Detect' ? detectedLang : sourceLang;
    
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          sourceLang: resolvedSource,
          targetLang,
          contextTone
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
        setTranslatedText('');
      } else if (data.translation) {
        setTranslatedText(data.translation);
        showToast('Successfully translated!', 'success');
        saveToHistory(inputText, data.translation, resolvedSource, targetLang, contextTone);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Connection error. Is server running?', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Refine and Enhance translation text
  const handleEnhance = async () => {
    if (!translatedText.trim()) {
      showToast('Nothing to polish yet. Please translate first.', 'warning');
      return;
    }

    setIsEnhancing(true);
    try {
      const res = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translatedText,
          targetLang,
          contextTone
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
      } else if (data.enhanced) {
        setTranslatedText(data.enhanced);
        showToast(`Refined text with ${contextTone} tone!`, 'success');
        saveToHistory(inputText, data.enhanced, sourceLang === 'Auto-Detect' ? detectedLang : sourceLang, targetLang, contextTone);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to enhance translation', 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  // TTS Read aloud via backend Gemini API
  const handleTTS = async (text: string, langName: string) => {
    if (!text.trim()) {
      showToast('No text available to read', 'warning');
      return;
    }

    if (ttsPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setTtsPlaying(false);
      return;
    }

    setTtsPlaying(true);
    showToast('Synthesizing speech with Gemini neural TTS...', 'info');

    try {
      // Map languages to best vocal models
      const voiceMap: Record<string, string> = {
        'English': 'Kore',
        'Japanese': 'Zephyr',
        'French': 'Puck',
        'German': 'Fenrir',
        'Spanish': 'Zephyr',
        'Chinese (Simplified)': 'Kore',
        'Korean': 'Zephyr',
        'default': 'Kore'
      };
      
      const requestedVoiceName = voiceMap[langName] || voiceMap.default;

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: requestedVoiceName
        }),
      });

      const data = await res.json();
      if (data.error) {
        showToast(data.error, 'error');
        setTtsPlaying(false);
        return;
      }

      if (data.audio) {
        const audioUrl = `data:audio/wav;base64,${data.audio}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setTtsPlaying(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          showToast('Failed to decode audio. Try again.', 'error');
          setTtsPlaying(false);
          audioRef.current = null;
        };
        await audio.play();
      } else {
        showToast('Did not receive audio stream data.', 'warning');
        setTtsPlaying(false);
      }
    } catch (err) {
      console.error(err);
      showToast('TTS audio read-aloud failed', 'error');
      setTtsPlaying(false);
    }
  };

  // Swap language function
  const handleSwap = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    const prevInput = inputText;
    const prevTranslation = translatedText;

    if (prevSource === 'Auto-Detect') {
      setSourceLang(prevTarget);
      setTargetLang(detectedLang);
    } else {
      setSourceLang(prevTarget);
      setTargetLang(prevSource);
    }

    setInputText(prevTranslation);
    setTranslatedText(prevInput);
    showToast('Languages and text swapped', 'info');
  };

  // Utility to handle copying to clipboard
  const copyToClipboard = async (text: string, isInput: boolean) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (isInput) {
        setCopiedInput(true);
        setTimeout(() => setCopiedInput(false), 2000);
      } else {
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 2000);
      }
      showToast('Copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
  };

  const getLanguageHeaderDisplay = (lang: string) => {
    if (lang === 'Auto-Detect') {
      return `Auto-Detect (${detectedLang})`;
    }
    return lang;
  };

  return (
    <div id="frosted-glass-workspace" className="relative min-h-screen bg-[#0c0e14] text-white flex flex-col font-sans overflow-x-hidden antialiased">
      {/* Mesh Blob Decorative Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/30 filter blur-[120px] mix-blend-screen animate-pulse pointer-events-none z-0"></div>
      <div className="absolute bottom-[5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-pink-600/25 filter blur-[100px] mix-blend-screen pointer-events-none z-0"></div>
      <div className="absolute top-[35%] left-[40%] w-[350px] h-[350px] rounded-full bg-purple-600/20 filter blur-[130px] mix-blend-screen pointer-events-none z-0"></div>

      {/* Global Toast Alert Overlay */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-xl translate-y-0 opacity-100 transition-all duration-300 ${
              t.type === 'success' ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-300' :
              t.type === 'error' ? 'bg-rose-950/85 border-rose-500/30 text-rose-300' :
              t.type === 'warning' ? 'bg-amber-950/85 border-amber-500/30 text-amber-300' :
              'bg-indigo-950/85 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <div className="text-sm font-medium flex-1">{t.text}</div>
          </div>
        ))}
      </div>

      {/* Primary Header Layout */}
      <header className="relative w-full z-10 border-b border-white/5 backdrop-blur-md bg-[#0c0e14]/40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 flex items-center justify-center">
              <Languages className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                LINGO.AI
              </span>
              <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 rounded">
                v2.5
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
            <a href="#converter" className="hover:text-white transition-colors flex items-center gap-1.5 text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Translator
            </a>
            <button 
              onClick={() => setShowHistory(true)}
              className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-4 h-4" /> History ({history.length})
            </button>
            <a 
              href="https://ai.studio/build" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" /> Documentation
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 md:hidden rounded-xl border border-white/5 hover:border-white/10 bg-white/3 hover:bg-white/5 text-white/70 transition-all"
              title="View History"
            >
              <History className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-xs uppercase font-semibold text-white/50 tracking-wider">
                Active Client
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Section */}
      <main id="converter" className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-center relative z-10">
        <div className="glass-card w-full rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10 bg-[#141721]/30 backdrop-blur-2xl">
          {/* Top Info Ribbon */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-white/5 bg-[#0c0e14]/20">
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-400/80 font-semibold tracking-wider uppercase bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-400/20">
                Cognitive Translation
              </span>
              <h2 className="text-sm text-white/60 font-medium">
                Deep neural translation paired with real-time copyediting polish
              </h2>
            </div>
            
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>{showHistory ? 'Hide Logs' : 'Show Logs'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 relative min-h-[460px]">
            {/* Input Pane / Left Side */}
            <div className="flex flex-col p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-white/5 bg-white/1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-white/40 tracking-wider">From</span>
                  <div className="relative">
                    <select 
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="glass-selector text-sm font-semibold py-1.5 pl-3 pr-8 rounded-xl text-indigo-300 transition-all cursor-pointer outline-none select-none appearance-none"
                    >
                      <option value="Auto-Detect">✨ Auto-Detect Language</option>
                      {LANGUAGES.map(lang => (
                        <option key={`source-${lang}`} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isDetecting && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting...</span>
                    </div>
                  )}
                  {sourceLang === 'Auto-Detect' && !isDetecting && inputText.trim() && (
                    <span className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-medium">
                      Detected: {detectedLang}
                    </span>
                  )}
                  <span className="text-xs text-white/30 font-mono">
                    {inputText.length} / 5000
                  </span>
                </div>
              </div>

              {/* Text Input Block */}
              <div className="flex-1 flex flex-col relative group min-h-[180px]">
                <textarea
                  className="w-full flex-1 bg-transparent border-0 text-white placeholder-white/20 text-lg md:text-xl font-normal leading-relaxed resize-none outline-none focus:ring-0 select-text"
                  placeholder="Type or paste content here..."
                  maxLength={5000}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                
                {inputText && (
                  <button
                    onClick={() => { setInputText(''); setTranslatedText(''); }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all text-sm flex items-center justify-center cursor-pointer"
                    title="Clear input"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Input Action Panel */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTTS(inputText, sourceLang === 'Auto-Detect' ? detectedLang : sourceLang)}
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/3 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Speak Input Text"
                  >
                    <Volume2 className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(inputText, true)}
                    disabled={!inputText.trim()}
                    className="p-2.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/3 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Copy Source Text"
                  >
                    {copiedInput ? <Check className="w-4.5 h-4.5 text-emerald-400" /> : <Copy className="w-4.5 h-4.5" />}
                  </button>
                </div>
                
                <span className="text-xs text-white/20 font-medium">Source panel</span>
              </div>
            </div>

            {/* Cross-Section Circle Swap Button */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden lg:block">
              <button 
                onClick={handleSwap}
                className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all duration-300 shadow-lg shadow-indigo-600/30 border-4 border-[#0e111a] cursor-pointer hover:rotate-180 hover:scale-110 active:scale-95"
                title="Swap Languages"
              >
                <ArrowLeftRight className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Output Pane / Right Side */}
            <div className="flex flex-col p-6 md:p-8 bg-indigo-500/[0.01]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-white/40 tracking-wider">To</span>
                  <div className="relative">
                    <select 
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="glass-selector text-sm font-semibold py-1.5 pl-3 pr-8 rounded-xl text-indigo-400 transition-all cursor-pointer outline-none select-none appearance-none"
                    >
                      {LANGUAGES.filter(l => l !== 'Auto-Detect').map(lang => (
                        <option key={`target-${lang}`} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/30 font-medium bg-white/5 px-2 py-0.5 rounded-md">
                    Target
                  </span>
                </div>
              </div>

              {/* Text Translation Result */}
              <div className="flex-1 flex flex-col justify-start relative min-h-[180px]">
                {isTranslating ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <span className="text-sm font-medium animate-pulse">Consulting Gemini Neural engines...</span>
                  </div>
                ) : (
                  <textarea
                    readOnly
                    className="w-full flex-1 bg-transparent border-0 text-[#c7d2fe] placeholder-white/10 text-lg md:text-xl font-normal leading-relaxed resize-none outline-none focus:ring-0 select-text"
                    placeholder="Translation display..."
                    value={translatedText}
                  />
                )}
              </div>

              {/* Output Action Panel */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTTS(translatedText, targetLang)}
                    disabled={!translatedText.trim() || isTranslating}
                    className="p-2.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/3 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                    title="Speak Translation"
                  >
                    {ttsPlaying ? <VolumeX className="w-4.5 h-4.5 text-rose-400" /> : <Volume2 className="w-4.5 h-4.5" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(translatedText, false)}
                    disabled={!translatedText.trim() || isTranslating}
                    className="p-2.5 rounded-xl border border-white/5 hover:border-white/10 bg-white/3 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
                    title="Copy Translation"
                  >
                    {copiedOutput ? <Check className="w-4.5 h-4.5 text-emerald-400" /> : <Copy className="w-4.5 h-4.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEnhance}
                    disabled={!translatedText.trim() || isTranslating || isEnhancing}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-400/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title={`Rewrite translation using the current ${contextTone} tone`}
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Polishing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Polish Translation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings & Bottom Controls Section */}
          <div className="border-t border-white/5 p-6 md:p-8 bg-[#0c0e14]/40 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            {/* Left Options Section */}
            <div className="flex flex-wrap gap-6 items-center w-full md:w-auto">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">AI Translation Model</span>
                <select 
                  value={aiModel} 
                  onChange={(e) => setAiModel(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-xs font-bold text-indigo-300 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {MODELS.map(m => (
                    <option key={`model-${m.value}`} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Context & Style Tone</span>
                <div className="flex items-center gap-1.5">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setContextTone(t.value)}
                      className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                        contextTone === t.value 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10' 
                          : 'bg-white/3 border-white/5 text-white/50 hover:bg-white/5'
                      }`}
                      title={t.label}
                    >
                      <span>{t.icon}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Primary Trigger Action Button */}
            <div className="flex items-center gap-4 w-full md:w-auto md:justify-end mt-4 md:mt-0">
              <button 
                onClick={handleTranslate}
                disabled={isTranslating || !inputText.trim()}
                className="w-full md:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-white/95 text-black font-extrabold text-sm tracking-wide shadow-xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer border border-white"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>LingoAI Translating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span>Translate Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Slidout Drawer: Translation History Logs */}
        {showHistory && (
          <div className="glass-card mt-6 p-6 rounded-3xl border border-white/10 bg-[#141721]/30 backdrop-blur-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold tracking-tight text-white">Translation History Logs</h3>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                  {history.length} Saved
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All</span>
                  </button>
                )}
                <button 
                  onClick={() => setShowHistory(false)}
                  className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/5 cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="py-12 text-center text-white/30 text-sm">
                No past transactions recorded yet. They will appear here automatically!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                {history.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl border border-white/5 bg-white/1 hover:bg-white/2 transition-colors relative group">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1 text-xs font-semibold text-indigo-300">
                        <span>{item.sourceLang}</span>
                        <span>➔</span>
                        <span>{item.targetLang}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{item.tone}</span>
                        <span className="text-[10px] text-white/30">{item.timestamp}</span>
                      </div>
                    </div>

                    <div className="text-xs text-white/60 mb-1 line-clamp-2 italic">“{item.sourceText}”</div>
                    <div className="text-sm font-semibold text-[#c7d2fe] line-clamp-2">{item.translatedText}</div>

                    <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setInputText(item.sourceText);
                          setTranslatedText(item.translatedText);
                          setSourceLang(item.sourceLang);
                          setTargetLang(item.targetLang);
                          setContextTone(item.tone);
                          showToast('Loaded past query', 'info');
                        }}
                        className="p-1 px-2 text-[10px] font-bold tracking-wide rounded-md bg-indigo-500 hover:bg-indigo-400 text-white flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Use Query
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Decorative Brand/Specs Bottom Section */}
      <footer className="w-full text-center py-8 text-neutral-600 border-t border-white/5 text-[11px] font-medium tracking-wider uppercase mt-auto">
        <span>© 2026 LingoAI Translation Corp. Powered by Gemini Flash Neural Network.</span>
      </footer>
    </div>
  );
}
