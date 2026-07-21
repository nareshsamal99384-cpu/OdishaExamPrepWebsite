import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export type VoiceLanguage = 'en-IN' | 'or-IN' | 'hi-IN';

export interface UseVoiceInteractionOptions {
  language?: VoiceLanguage;
  onTranscriptChange?: (text: string) => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  autoSendOnSpeechEnd?: boolean;
}

/**
 * Sanitizes LaTeX math formulas and Markdown markup into clean pronounceable English text for SpeechSynthesis.
/**
 * Sanitizes LaTeX math formulas, Markdown markup, emojis, and visual bullets into clean, pronounceable English text for SpeechSynthesis.
 */
export function sanitizeTextForSpeech(input: string): string {
  if (!input) return '';

  let text = input;

  // Remove Markdown code blocks
  text = text.replace(/```[\s\S]*?```/g, ' code snippet omitted ');

  // Remove emojis and special unicode symbols
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}]/gu, '');

  // Sanitize common LaTeX math expressions
  text = text
    .replace(/\$\$(.*?)\$\$/g, ' $1 ') // Block math
    .replace(/\$(.*?)\$/g, ' $1 ')     // Inline math
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2') // Fractions
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')      // Square roots
    .replace(/\\sum/g, 'summation of')
    .replace(/\\int/g, 'integral of')
    .replace(/\\pi/g, 'pi')
    .replace(/\\theta/g, 'theta')
    .replace(/\\infty/g, 'infinity')
    .replace(/\\pm/g, 'plus or minus')
    .replace(/\^2/g, ' squared')
    .replace(/\^3/g, ' cubed')
    .replace(/\^\{([^}]+)\}/g, ' to the power of $1')
    .replace(/\^([0-9a-zA-Z])/g, ' to the power of $1')
    .replace(/\\times/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\approx/g, ' is approximately equal to ')
    .replace(/\\neq/g, ' is not equal to ')
    .replace(/\\le|\\leq/g, ' is less than or equal to ')
    .replace(/\\ge|\\geq/g, ' is greater than or equal to ');

  // Remove bullet points, list prefixes, headers, and markdown decorative symbols
  text = text
    .replace(/^[\s]*[•\-*▪►\d+\.]+\s+/gm, '') // Bullet lines
    .replace(/[*_~`#>/|]/g, ' ')               // Markdown formatting
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // Markdown links
    .replace(/\(([^\)]*OEP[^\)]*)\)/gi, '')    // Remove OEP internal references in parens
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Scores and selects the highest quality Natural, Neural, or HD human voice installed in the browser.
 */
export function getBestVoice(voices: SpeechSynthesisVoice[], targetLang: VoiceLanguage = 'en-IN'): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const scoreVoice = (voice: SpeechSynthesisVoice): number => {
    let score = 0;
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    const target = targetLang.toLowerCase();
    const langPrefix = target.slice(0, 2); // 'en', 'hi', or 'or'

    // 1. Language alignment
    if (lang === target || lang.replace('_', '-') === target.replace('_', '-')) {
      score += 120;
    } else if (lang.startsWith(langPrefix)) {
      score += 70;
    } else if (lang.startsWith('en')) {
      score += 35; // Fallback English
    }

    // 2. Premium Neural / Natural human voice markers
    if (name.includes('natural')) score += 100;
    if (name.includes('neural')) score += 100;
    if (name.includes('google')) score += 80;
    if (name.includes('online')) score += 60;
    if (name.includes('samantha')) score += 70;
    if (name.includes('aria')) score += 70;
    if (name.includes('jenny')) score += 70;
    if (name.includes('guy')) score += 60;
    if (name.includes('siri')) score += 70;
    if (name.includes('premium')) score += 80;
    if (name.includes('enhanced')) score += 70;

    // 3. Penalty for legacy robotic voices
    if (name.includes('espeak')) score -= 150;
    if (name.includes('desktop')) score -= 50;
    if (name.includes('compact')) score -= 40;

    return score;
  };

  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] || null;
}

export function useVoiceInteraction(options: UseVoiceInteractionOptions = {}) {
  const {
    language: initialLanguage = 'en-IN',
    onTranscriptChange,
    onSpeechEnd,
  } = options;

  const [language, setLanguage] = useState<VoiceLanguage>(initialLanguage);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isLiveVoiceMode, setIsLiveVoiceMode] = useState(false);
  const [hasSpeechRecognitionSupport, setHasSpeechRecognitionSupport] = useState(false);
  const [hasSpeechSynthesisSupport, setHasSpeechSynthesisSupport] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Cache mic permission so we skip getUserMedia roundtrip on every call
  const micPermGrantedRef = useRef(false);

  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const transcriptRef = useRef(transcript);
  const shouldKeepListeningRef = useRef(false);
  // Ref mirrors isLiveVoiceMode so onend closure always reads the current value
  const isLiveVoiceModeRef = useRef(false);
  // Ref mirrors isSpeaking so onend doesn't restart while AI is talking
  const isSpeakingRef = useRef(false);
  // Guard: prevents multiple simultaneous auto-restart timeouts
  const liveVoiceRestartPendingRef = useRef(false);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    isLiveVoiceModeRef.current = isLiveVoiceMode;
  }, [isLiveVoiceMode]);

  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([]);

  // Check browser support and load voices on mount
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setHasSpeechRecognitionSupport(!!SpeechRecognitionClass);
    const hasSynth = 'speechSynthesis' in window;
    setHasSpeechSynthesisSupport(hasSynth);

    if (hasSynth) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          setVoiceList(voices);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Clean up Speech Recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          shouldKeepListeningRef.current = false;
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Speech Recognition Control Functions
  const startListening = useCallback(async () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.');
      return;
    }

    // Detect Brave Browser privacy shield lock
    try {
      const isBrave = (navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function'
        ? await (navigator as any).brave.isBrave()
        : false;
      if (isBrave) {
        toast('🦁 Brave Browser: If voice text is blank, enable "Google services for speech recognition" in brave://settings/privacy', {
          icon: '💡',
          duration: 7000,
          id: 'brave-speech-note'
        });
      }
    } catch (_) {}

    // Always stop and discard old instance to prevent InvalidStateError
    if (recognitionRef.current) {
      try {
        shouldKeepListeningRef.current = false;
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    // Clear any pending restart guard so this fresh call is not blocked
    liveVoiceRestartPendingRef.current = false;

    // Only check/request microphone permission on first use; skip afterwards to avoid ~500ms delay
    if (!micPermGrantedRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        micPermGrantedRef.current = true;
      } catch (permErr) {
        console.warn('Microphone access check error:', permErr);
        toast.error('Microphone permission denied. Please allow microphone access in your browser settings.');
        return;
      }
    }

    try {
      const recognition = new SpeechRecognitionClass();
      // Use continuous = false for immediate Chrome real-time result dispatching without buffer delays
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      setTranscript('');
      setInterimTranscript('');
      transcriptRef.current = '';
      setVoiceError(null);
      shouldKeepListeningRef.current = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let fullFinal = '';
        let fullInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            fullFinal += text + ' ';
          } else {
            fullInterim += text + ' ';
          }
        }

        const finalTrimmed = fullFinal.trim();
        const interimTrimmed = fullInterim.trim();
        const combinedText = [finalTrimmed, interimTrimmed].filter(Boolean).join(' ');

        setTranscript(finalTrimmed);
        setInterimTranscript(interimTrimmed);
        transcriptRef.current = combinedText;

        if (onTranscriptChangeRef.current && combinedText) {
          onTranscriptChangeRef.current(combinedText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error('Microphone permission denied. Please allow microphone access in your browser settings.');
          shouldKeepListeningRef.current = false;
          setIsListening(false);
        } else if (event.error !== 'no-speech') {
          setVoiceError(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setInterimTranscript('');

        const finalCaptured = transcriptRef.current;
        if (finalCaptured) {
          // Speech was captured — fire callbacks
          if (onTranscriptChangeRef.current) {
            onTranscriptChangeRef.current(finalCaptured);
          }
          if (onSpeechEndRef.current) {
            onSpeechEndRef.current(finalCaptured);
          }
        }

        // Always close the bar cleanly.
        // Live Voice auto-restart is handled by the component useEffect
        // which has access to loading state and can guard properly.
        shouldKeepListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      // Set isListening immediately for instant visual feedback before browser confirms
      setIsListening(true);
      try {
        recognition.start();
      } catch (startErr: any) {
        // Roll back optimistic isListening if start actually fails
        console.warn('recognition.start() failed:', startErr);
        setIsListening(false);
        recognitionRef.current = null;
        toast.error('Failed to start microphone. Please try again.');
        return;
      }
      // Only show toast on very first activation, not every restart
      if (!micPermGrantedRef.current) {
        toast.success('🎙️ Microphone active. Speak now...', { id: 'mic-active', duration: 2000 });
      }
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      toast.error('Failed to access microphone for speech recognition.');
    }
  }, [language]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    toast('Microphone stopped.', { icon: '🛑', id: 'mic-stopped', duration: 2000 });
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Text-To-Speech (TTS) Control Functions
  const speak = useCallback((textToSpeak: string, onComplete?: () => void) => {
    if (!('speechSynthesis' in window) || !textToSpeak) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const cleanText = sanitizeTextForSpeech(textToSpeak);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate || 0.98;
    utterance.pitch = 1.0;
    utterance.lang = language;

    // Use neural/natural voice scoring matrix to pick the best voice available
    const availableVoices = voiceList.length > 0 ? voiceList : (window.speechSynthesis.getVoices() || []);
    const bestVoice = getBestVoice(availableVoices, language);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    // Set speaking state immediately to prevent race conditions during utterance setup
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      currentUtteranceRef.current = null;
      if (onComplete) onComplete();
    };
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      currentUtteranceRef.current = null;
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [language, speechRate]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      currentUtteranceRef.current = null;
    }
  }, []);

  const toggleLiveVoiceMode = useCallback(() => {
    setIsLiveVoiceMode((prev) => {
      const next = !prev;
      isLiveVoiceModeRef.current = next; // sync ref immediately
      if (!next && isSpeaking) {
        stopSpeaking();
      }
      return next;
    });
  }, [isSpeaking, stopSpeaking]);

  /** Atomic helper: activates Live Voice mode AND starts the mic in one call, no render gap. */
  const startLiveVoice = useCallback(() => {
    isLiveVoiceModeRef.current = true; // sync ref immediately so onend sees it
    setIsLiveVoiceMode(true);
    startListening();
  }, [startListening]);

  return {
    language,
    setLanguage,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    speechRate,
    setSpeechRate,
    isLiveVoiceMode,
    setIsLiveVoiceMode,
    toggleLiveVoiceMode,
    startLiveVoice,
    hasSpeechRecognitionSupport,
    hasSpeechSynthesisSupport,
    voiceError,
  };
}
