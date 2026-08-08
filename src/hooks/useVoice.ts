import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
}

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useTextToSpeech(options: UseVoiceOptions = {}) {
  const { lang = "en-US", rate = 0.9, pitch = 1.1, volume = 1, voice: voiceName } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getVoices = useCallback(() => {
    return window.speechSynthesis.getVoices();
  }, []);

  const findVoice = useCallback(() => {
    const voices = getVoices();
    if (voiceName) {
      return voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase()));
    }
    const preferredVoices = lang.toLowerCase().startsWith("hi")
      ? ["Google हिन्दी", "Google Hindi", "Lekha", "Kalpana", "Hindi", "hi-IN"]
      : ["Samantha", "Karen", "Google US English", "Google UK English Female", "Microsoft Zira", "Daniel"];
    for (const pref of preferredVoices) {
      const found = voices.find(v =>
        v.name.toLowerCase().includes(pref.toLowerCase()) ||
        v.lang.toLowerCase().includes(pref.toLowerCase())
      );
      if (found) return found;
    }
    const langPrefix = lang.split("-")[0].toLowerCase();
    return voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) || voices.find(v => v.lang.startsWith("en")) || voices[0];
  }, [getVoices, voiceName, lang]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = Math.max(0, Math.min(1, volume));

    const voice = findVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      onEnd?.();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [lang, rate, pitch, volume, findVoice]);

  const speakSequence = useCallback((texts: string[], startIndex: number = 0, onComplete?: () => void) => {
    if (startIndex >= texts.length) {
      setCurrentIndex(-1);
      onComplete?.();
      return;
    }

    setCurrentIndex(startIndex);
    speak(texts[startIndex], () => {
      speakSequence(texts, startIndex + 1, onComplete);
    });
  }, [speak]);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentIndex(-1);
  }, []);

  const toggle = useCallback(() => {
    if (isPaused) {
      resume();
    } else if (isSpeaking) {
      pause();
    }
  }, [isPaused, isSpeaking, pause, resume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    speak,
    speakSequence,
    pause,
    resume,
    stop,
    toggle,
    isSpeaking,
    isPaused,
    currentIndex,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
  };
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = "en-US", continuous = false, interimResults = true } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) {
      console.warn("Speech recognition not supported");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let final = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript(prev => prev + " " + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, continuous, interimResults]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    start,
    stop,
    reset,
    isListening,
    transcript: transcript.trim(),
    interimTranscript,
    isSupported,
  };
}
