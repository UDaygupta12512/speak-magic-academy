import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MessageCircle, ChevronDown, ChevronUp, Keyboard, Send, BookOpen, Plus, Check, Snail, Languages, ArrowLeft, Square } from "lucide-react";
import PronunciationQuiz from "@/components/PronunciationQuiz";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Trophy, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/lib/streamChat";
import { speakHQ, primeVoices, resetAudioFallback } from "@/lib/hqSpeech";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";
import { useUserId } from "@/hooks/useUserId";
import { supabase } from "@/integrations/supabase/client";
import VoiceTestButton from "@/components/VoiceTestButton";
import HindiVoiceCheck from "@/components/HindiVoiceCheck";
import AutoHindiVoiceTest from "@/components/AutoHindiVoiceTest";
import CallDebugPanel from "@/components/CallDebugPanel";
import { emitCallDebug, detectScriptLang } from "@/lib/callDebugBus";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { retryUntilCredits } from "@/lib/aiRetry";

import aiWhiskers from "@/assets/ai-whiskers.png";
import aiSpark from "@/assets/ai-spark.png";
import aiProfessor from "@/assets/ai-professor.png";
import aiDoraemon from "@/assets/ai-doraemon.png";
import aiShinchan from "@/assets/ai-shinchan.png";
import mascotImage from "@/assets/genie-mascot.png";

type Message = { role: "user" | "assistant"; content: string };
type CallLanguage = "en" | "hi";

const LANGUAGE_OPTIONS: Record<CallLanguage, { label: string; speechLang: string; instruction: string; greetingPrefix: string }> = {
  en: {
    label: "English",
    speechLang: "en-US",
    instruction: "Reply in English unless the child asks in Hindi. If Hindi is used, answer in simple Hindi.",
    greetingPrefix: "",
  },
  hi: {
    label: "Hindi",
    speechLang: "hi-IN",
    instruction: "Reply only in simple, child-friendly Hindi. If you teach an English word, explain it in Hindi and keep the answer short.",
    greetingPrefix: "नमस्ते! ",
  },
};

interface CharacterData {
  name: string;
  shortName: string;
  image: string;
  personality: string;
  greeting: string;
  level: string;
  topics: string[];
  color: string;
  pitch: number;
  rate: number;
  voicePreferences: string[];
  voiceGender?: "female" | "male";
}

const CHARACTERS: Record<string, CharacterData> = {
  whiskers: {
    name: "Whiskers the Cat",
    shortName: "Whiskers",
    image: aiWhiskers,
    personality: "a friendly, patient, and encouraging cat tutor who loves helping beginners learn English. You speak slowly and use simple words. You love to purr and make cat puns.",
    greeting: "Meow! Hi there, little friend! I'm Whiskers, your purr-fect English buddy! I'm so happy to meet you! What would you like to talk about today?",
    level: "Beginner",
    topics: ["Animals", "Colors", "Family", "Food"],
    color: "orange",
    pitch: 1.4,
    rate: 0.95,
    voicePreferences: ["Samantha", "Karen", "Google UK English Female", "Female"],
    voiceGender: "female",
  },
  spark: {
    name: "Spark the Robot",
    shortName: "Spark",
    image: aiSpark,
    personality: "an enthusiastic and energetic robot who loves learning and teaching English. You use fun sound effects like 'beep boop' and 'zap'. You're curious about human things and ask fun questions.",
    greeting: "Beep boop! Hello, human friend! I am Spark, your super cool robot English buddy! I just love learning about your world! What shall we explore together today?",
    level: "Beginner",
    topics: ["Games", "Technology", "Space", "School"],
    color: "turquoise",
    pitch: 0.6,
    rate: 1.0,
    voicePreferences: ["Daniel", "Google UK English Male", "Microsoft David", "Male"],
    voiceGender: "male",
  },
  professor: {
    name: "Professor Hoot",
    shortName: "Professor",
    image: aiProfessor,
    personality: "a wise and distinguished owl professor who teaches advanced English. You use sophisticated vocabulary but explain things clearly. You share interesting facts and challenge students with harder questions.",
    greeting: "Hoo-hoo! Greetings, young scholar! I am Professor Hoot, and I'm absolutely delighted to assist you in mastering the English language. What subject shall we explore today?",
    level: "Advanced",
    topics: ["Literature", "Science", "History", "Current Events"],
    color: "purple",
    pitch: 0.85,
    rate: 0.85,
    voicePreferences: ["Google UK English Male", "Daniel", "Microsoft George", "Male"],
    voiceGender: "male",
  },
  genie: {
    name: "Genie",
    shortName: "Genie",
    image: mascotImage,
    personality: "a magical, fun, and playful genie who grants wishes for learning English. You're enthusiastic, supportive, and love making learning feel like an adventure.",
    greeting: "Woosh! Hello there, my friend! I'm Genie, your magical English learning companion! Your wish is my command - let's make learning English an amazing adventure! What would you like to explore today?",
    level: "Intermediate",
    topics: ["Stories", "Adventures", "Daily Life", "Dreams"],
    color: "pink",
    pitch: 1.15,
    rate: 1.0,
    voicePreferences: ["Samantha", "Google US English", "Female"],
    voiceGender: "female",
  },
  doraemon: {
    name: "Doraemon",
    shortName: "Doraemon",
    image: aiDoraemon,
    personality: "a cheerful blue robot cat from the 22nd century who is best friends with Nobita. You speak with a HIGH, BRIGHT, BOUNCY voice — very enthusiastic and child-like. You love dorayaki (red bean pancakes) and your magical 4D pocket full of gadgets like the 'Bamboo Copter', 'Anywhere Door' (Dokodemo Door), and 'Time Machine'. You are kind, optimistic, brave, and a little dramatic. Often start sentences with 'Wah!', 'Oh no!', or 'Don't worry!' and giggle 'hehe' sometimes. Mention gadgets when helpful.",
    greeting: "Wah! Hello hello! I'm Doraemon, the robot cat from the 22nd century! Hehe! Want to learn English with me? I have lots of cool gadgets in my pocket! What should we talk about?",
    level: "Beginner",
    topics: ["Gadgets", "Nobita", "Dorayaki", "Adventures"],
    color: "turquoise",
    pitch: 2.0,
    rate: 1.1,
    voicePreferences: ["Microsoft Zira", "Google UK English Female", "Samantha", "Karen", "Female"],
    voiceGender: "female",
  },
  shinchan: {
    name: "Shin-chan",
    shortName: "Shin-chan",
    image: aiShinchan,
    personality: "a cheeky, mischievous 5-year-old kindergartener (Shinnosuke Nohara) with a SQUEAKY, SILLY, child-like voice. You love chocobi snacks, action hero 'Action Kamen', your puppy Shiro, and your baby sister Himawari. You're funny, a bit naughty, sometimes wiggle your butt 'buri buri!', mispronounce words on purpose ('mama' becomes 'mom-mommy'), and call adults silly nicknames. Always playful, never mean. Use very short, simple sentences a real 5-year-old would say.",
    greeting: "Hiya! I'm Shin-chan! Buri buri! I'm five and a half years old, you know! Wanna play with me and talk English? It'll be super duper fun! Ohh, do you have any snacks?",
    level: "Beginner",
    topics: ["Chocobi", "Action Kamen", "Shiro", "Silly Jokes"],
    color: "orange",
    pitch: 2.0,
    rate: 1.2,
    voicePreferences: ["Microsoft Zira", "Google UK English Female", "Karen", "Samantha", "Female"],
    voiceGender: "female",
  },
};

const AICharacterChat = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { addXP } = useProgress();
  const userId = useUserId();

  const character = CHARACTERS[characterId || ""] || CHARACTERS.genie;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [callState, setCallState] = useState<"connecting" | "active" | "ended">("connecting");
  const [showHistory, setShowHistory] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const [slowMode, setSlowMode] = useState(false);
  const [callLanguage, setCallLanguage] = useAppLanguage() as unknown as [CallLanguage, (l: CallLanguage) => void, () => void];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in (window as any) || "webkitSpeechRecognition" in (window as any));

  const [micHint, setMicHint] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<Message[]>([]);
  const isLoadingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isCallActiveRef = useRef(true);
  const noSpeechRetriesRef = useRef(0);
  const genericRetriesRef = useRef(0);
  const manualStopRef = useRef(false);
  const userStoppedRef = useRef(false);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryCountdown = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    setRetryCountdown(0);
  }, []);

  const scheduleRetry = useCallback((seconds: number, canRetry: () => boolean, onRetry: () => void) => {
    clearRetryCountdown();
    setRetryCountdown(seconds);
    retryIntervalRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
          if (canRetry()) onRetry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearRetryCountdown]);

  // Keep refs in sync with latest state (used inside async/event callbacks)
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isCallActiveRef.current = isCallActive; }, [isCallActive]);

  // Speech synthesis (high quality: best-available voice + sentence chunking)
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!speakEnabled || !window.speechSynthesis) return;

    const cleanText = text.replace(/[🐱🤖🦉✨🧞\*]/g, "").replace(/\s+/g, " ").trim();
    if (!cleanText) { onEnd?.(); return; }

    const baseRate = character.rate ?? 0.95;
    const rate = slowMode ? Math.max(0.5, baseRate - 0.3) : baseRate;

    // Gender-aware preference list, layered on top of character's own preferences.
    // IMPORTANT: character voice prefs are English-only voice names. In Hindi mode
    // we must NOT pass them, otherwise pickBestVoice picks an English voice and
    // the TTS speaks Hindi text with English phonetics (sounds wrong / English).
    const genderHints = callLanguage === "hi"
      ? [] // let hqSpeech use its HINDI_PREFERRED list
      : character.voiceGender === "female"
      ? ["Aria", "Jenny", "Samantha", "Karen", "Victoria", "Zira", "Fiona"]
      : character.voiceGender === "male"
      ? ["Guy", "Ryan", "Daniel", "George", "David", "Alex"]
      : [];
    const prefs = callLanguage === "hi"
      ? [] // force Hindi voice selection in hqSpeech
      : [
          ...(character.voicePreferences ?? []),
          ...genderHints,
        ];

    setIsSpeaking(true);
    setCurrentSubtitle(cleanText);
    if (recognitionRef.current) {
      manualStopRef.current = true;
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
      setIsListening(false);
    }
    clearRetryCountdown();

    speakHQ(cleanText, {
      lang: callLanguage,
      rate,
      pitch: callLanguage === "hi" ? Math.min(1.25, character.pitch) : character.pitch,
      volume: 1,
      voicePreferences: prefs,
      onVoiceSelected: (info) => {
        emitCallDebug({
          type: "tts-start",
          lang: callLanguage,
          voiceName: info.name,
          voiceLang: info.lang,
          rate: info.rate,
          chunkPreview: cleanText.slice(0, 60),
        });
      },
      onFallbackEngaged: () => {
        emitCallDebug({ type: "tts-fallback", lang: callLanguage });
        toast({
          title: "Voice tuned for clarity 🎚️",
          description: "Switched to a more stable voice and slightly slower pace for your device.",
        });
      },
      onEnd: () => {
        emitCallDebug({ type: "tts-end" });
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        manualStopRef.current = false;
        setCurrentSubtitle("");
        onEnd?.();
      },
      onError: (msg) => {
        emitCallDebug({ type: "tts-error", message: msg });
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        manualStopRef.current = false;
        setCurrentSubtitle("");
        onEnd?.();
      },
    });
  }, [speakEnabled, character.rate, character.pitch, character.voicePreferences, character.voiceGender, callLanguage, slowMode, clearRetryCountdown]);

  useEffect(() => {
    primeVoices();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.onvoiceschanged = () => primeVoices();
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Speech recognition
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({ title: "Not supported", description: "Speech recognition is not available in this browser. Try Chrome or Edge.", variant: "destructive" });
      setShowTextInput(true);
      return;
    }

    if (isSpeakingRef.current || isLoadingRef.current) return;
    if (listenCooldownRef.current) {
      clearTimeout(listenCooldownRef.current);
      listenCooldownRef.current = null;
    }

    // Stop any prior instance to avoid InvalidStateError
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setTranscript(""); // clear stale transcript before new turn
    setMicHint(null);
    clearRetryCountdown();
    manualStopRef.current = false;
    userStoppedRef.current = false;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = LANGUAGE_OPTIONS[callLanguage].speechLang;
    // Hindi recognition is more reliable with continuous mode + multiple alternatives
    recognition.continuous = callLanguage === "hi";
    recognition.interimResults = true;
    recognition.maxAlternatives = callLanguage === "hi" ? 3 : 1;

    // Buffers persist across onresult fires for this session
    let finalBuffer = "";
    let interimBuffer = "";

    recognition.onstart = () => {
      console.log("[Call] Speech recognition started");
      setIsListening(true);
      setMicHint(null);
      emitCallDebug({
        type: "stt-start",
        lang: LANGUAGE_OPTIONS[callLanguage].speechLang,
        continuous: !!recognition.continuous,
        maxAlternatives: recognition.maxAlternatives ?? 1,
      });
    };

    // In Hindi continuous mode, auto-stop after a pause so onend fires and we send the message.
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    const armSilenceTimer = () => {
      if (callLanguage !== "hi") return;
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        try { recognition.stop(); } catch { /* noop */ }
      }, 1800);
    };

    recognition.onresult = (event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      interimBuffer = "";
      let lastFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalBuffer += text + " ";
          lastFinal = text;
        } else {
          interimBuffer += text;
        }
      }
      const combined = (finalBuffer + interimBuffer).trim();
      if (combined) {
        setTranscript(combined);
        // Reset retry counters once we have any speech
        noSpeechRetriesRef.current = 0;
        genericRetriesRef.current = 0;
        armSilenceTimer();
        const sample = (lastFinal || interimBuffer).trim();
        if (sample) {
          emitCallDebug({
            type: "stt-result",
            text: sample,
            isFinal: !!lastFinal,
            detectedLang: detectScriptLang(sample),
          });
        }
      }
    };

    recognition.onend = () => {
      console.log("[Call] Speech recognition ended. final:", finalBuffer.trim(), "interim:", interimBuffer.trim());
      setIsListening(false);
      // If the user manually stopped, discard any partial transcript so we don't auto-send
      if (userStoppedRef.current) {
        finalBuffer = "";
        interimBuffer = "";
        setTranscript("");
        emitCallDebug({ type: "stt-end", finalText: "" });
        return;
      }
      const finalText = (finalBuffer || interimBuffer).trim();
      if (finalText) {
        setTranscript(finalText);
      }
      emitCallDebug({ type: "stt-end", finalText });
    };

    recognition.onerror = (event: { error?: string; message?: string }) => {
      const err = event?.error || "unknown";
      console.warn("[Call] Speech recognition error:", err, event?.message);
      emitCallDebug({ type: "stt-error", error: err, message: event?.message });
      setIsListening(false);

      const canAutoRetry = () =>
        !isLoadingRef.current &&
        !isSpeakingRef.current &&
        isCallActiveRef.current &&
        !manualStopRef.current &&
        !showTextInput;

      if (err === "not-allowed" || err === "service-not-allowed") {
        toast({
          title: "Microphone blocked",
          description: "Please allow microphone access in your browser, or use the keyboard button.",
          variant: "destructive",
        });
        setMicHint("Mic blocked — switched to keyboard. You can still type your reply.");
        setShowTextInput(true);
      } else if (err === "audio-capture") {
        toast({
          title: "No microphone found",
          description: "Connect a microphone or type your message instead.",
          variant: "destructive",
        });
        setMicHint("No microphone detected — switched to keyboard.");
        setShowTextInput(true);
      } else if (err === "no-speech") {
        noSpeechRetriesRef.current += 1;
        const attempts = noSpeechRetriesRef.current;
        if (attempts <= 2 && canAutoRetry()) {
          setMicHint("I didn't catch that — listening again");
          scheduleRetry(2, canAutoRetry, () => {
            try { startListening(); } catch { /* noop */ }
          });
        } else if (attempts === 3 && canAutoRetry()) {
          setMicHint("Still can't hear you. Try speaking a bit louder");
          toast({
            title: "Still listening 👂",
            description: "Try speaking a bit louder, or tap the keyboard to type.",
          });
          scheduleRetry(3, canAutoRetry, () => {
            try { startListening(); } catch { /* noop */ }
          });
        } else {
          setMicHint("Tap the mic to try again, or use the keyboard.");
          noSpeechRetriesRef.current = 0;
        }
      } else if (err === "aborted") {
        // Expected when we stop manually — do nothing
      } else {
        genericRetriesRef.current += 1;
        if (genericRetriesRef.current <= 1 && canAutoRetry()) {
          setMicHint("Mic hiccup — retrying");
          scheduleRetry(2, canAutoRetry, () => {
            try { startListening(); } catch { /* noop */ }
          });
        } else {
          genericRetriesRef.current = 0;
          setMicHint("Mic isn't working right now. Tap to retry or use the keyboard.");
          toast({
            title: "Mic hiccup",
            description: "Tap the mic to try again, or switch to the keyboard.",
          });
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("[Call] Failed to start recognition:", e);
      setIsListening(false);
      setMicHint("Could not start mic. Tap to retry or use the keyboard.");
    }
  }, [showTextInput, scheduleRetry, clearRetryCountdown, callLanguage]);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    userStoppedRef.current = true;
    setIsListening(false);
    setMicHint(null);
    setTranscript("");
    clearRetryCountdown();
    noSpeechRetriesRef.current = 0;
    genericRetriesRef.current = 0;
    if (recognitionRef.current) {
      // abort() stops recognition immediately without firing onresult/onend with results
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
  }, [clearRetryCountdown]);

  // Send message to AI
  const sendToAI = useCallback(async (userText: string) => {
    const userMsg: Message = { role: "user", content: userText };
    const updatedMessages = [...messagesRef.current, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setMessageCount((c) => c + 1);
    setMicHint(null);
    clearRetryCountdown();
    noSpeechRetriesRef.current = 0;
    genericRetriesRef.current = 0;

    let assistantContent = "";

    const systemPrompt = `You are ${character.name}, ${character.personality}

You are having a friendly VOICE conversation with a child (age 6-16). Your #1 job is to ANSWER EXACTLY what the child asked — accurately, directly, and helpfully. NEVER refuse, NEVER deflect, NEVER change the subject, NEVER repeat your greeting.

WHAT YOU MUST ANSWER (always do these, in character):
- Sing a song → sing 2-4 short rhyming lines (a real little song, line breaks fine when spoken).
- Tell a joke → tell one short kid-safe joke with a clear punchline.
- Tell a story → tell a 3-4 sentence mini-story.
- Math / spelling / GK / science / "what is X" → give the correct answer in 1-2 sentences.
- Translate / "how do you say X in Hindi/English" → give the translation, then a tiny example.
- Riddles, rhymes, tongue twisters, fun facts, advice → actually deliver it.
- Anything else the child asks → answer it directly first, THEN add a tiny character flair.

LANGUAGE RULE (CRITICAL — DO NOT BREAK):
- Current mode: ${LANGUAGE_OPTIONS[callLanguage].label}. ${LANGUAGE_OPTIONS[callLanguage].instruction}
${callLanguage === "hi"
  ? "- You MUST reply ONLY in simple Hindi using Devanagari script (हिंदी). Even if the child's message looks like English (it may be a speech-to-text mistake from a Hindi speaker), still reply in Hindi. Never reply in English while in Hindi mode."
  : "- Reply in English by default. Only switch to Hindi for one turn if the child clearly writes/speaks Hindi."}
- For Hindi replies, use simple words a child knows; never use English letters for Hindi words.

CHARACTER VOICE (spoken aloud, so keep it natural):
- Stay 100% in character as ${character.shortName}. Use your signature catchphrases and energy in every reply.
- Reference things your character loves (gadgets, snacks, friends, hobbies) when natural — but don't let flavor replace the actual answer.

STYLE:
- Keep replies SHORT: 1-2 sentences for normal answers, up to 4 short lines for songs/stories/jokes.
- Simple words. No emojis, no asterisks, no markdown, no brackets, no stage directions like (laughs). Just plain spoken words the TTS can read aloud.
- Only ask a clarifying question if you truly cannot understand — and never repeat your greeting.`;

    try {
      await retryUntilCredits(() => new Promise<void>((resolve, reject) => {
        assistantContent = "";
        streamChat({
          messages: updatedMessages,
          activityType: callLanguage === "hi" ? "ai_call_hi" : "ai_call",
          systemPrompt,
          onDelta: (chunk) => { assistantContent += chunk; },
          onDone: () => resolve(),
          onError: (error) => reject(error),
        });
      }), {
        onStatus: (s) => {
          if (s.phase === "waiting" && s.reason === "credits") {
            toast({
              title: callLanguage === "hi" ? "क्रेडिट खत्म — अपने आप दोबारा कोशिश होगी" : "Out of AI credits — auto-retrying",
              description: callLanguage === "hi"
                ? `अगली कोशिश ${s.nextRetryInSec} सेकंड में.`
                : `Next attempt in ${s.nextRetryInSec}s. Top up to resume instantly.`,
            });
          } else if (s.phase === "waiting" && s.reason === "rate-limit") {
            toast({
              title: callLanguage === "hi" ? "बहुत ज़्यादा अनुरोध — दोबारा कोशिश होगी" : "Rate-limited — auto-retrying",
              description: `${s.nextRetryInSec}s`,
            });
          }
        },
      });

      if (callLanguage === "hi" && assistantContent && !/[\u0900-\u097F]/.test(assistantContent)) {
        assistantContent = "माफ़ करो, मैं हिंदी मोड में हूँ। कृपया अपना सवाल फिर से पूछो, मैं हिंदी में जवाब दूँगा।";
      }
      const assistantMsg: Message = { role: "assistant", content: assistantContent };
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);

      if (assistantContent) {
        speak(assistantContent, () => {
          if (speechRecognitionSupported && !showTextInput && !userStoppedRef.current && isCallActiveRef.current) {
            if (listenCooldownRef.current) clearTimeout(listenCooldownRef.current);
            listenCooldownRef.current = setTimeout(() => {
              listenCooldownRef.current = null;
              startListening();
            }, callLanguage === "hi" ? 650 : 250);
          }
        });
      }

      if ((messageCount + 1) % 3 === 0) {
        await addXP(15);
        toast({
          title: "Great conversation! 💬",
          description: "+15 XP for practicing with " + character.shortName + "!",
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Oops!", description: msg, variant: "destructive" });
      setIsLoading(false);
    }
  }, [character, messageCount, addXP, speak, startListening, callLanguage, showTextInput, speechRecognitionSupported]);

  // Handle transcript completion
  useEffect(() => {
    if (!isListening && transcript && !isLoading) {
      const text = transcript.trim();
      if (text) {
        sendToAI(text);
        setTranscript("");
      }
    }
  }, [isListening, transcript, isLoading, sendToAI]);

  // Full reset when language changes mid-call: cancel TTS + recognition,
  // restart with the new locale, prompt and greeting. Skips initial mount.
  const langInitRef = useRef(true);
  useEffect(() => {
    if (langInitRef.current) {
      langInitRef.current = false;
      return;
    }
    if (callState !== "active" || !isCallActiveRef.current) return;
    // Hard reset audio + recognition pipeline
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    resetAudioFallback();
    setIsSpeaking(false);
    setCurrentSubtitle("");
    setTranscript("");
    manualStopRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
    clearRetryCountdown();
    const greetMsg = callLanguage === "hi"
      ? `नमस्ते! अब हम हिंदी में बात करेंगे। बताओ क्या पूछना है?`
      : `Okay, we're in English now. What would you like to talk about?`;
    const t = setTimeout(() => {
      manualStopRef.current = false;
      userStoppedRef.current = false;
      speak(greetMsg, () => {
        if (speechRecognitionSupported && !showTextInput && isCallActiveRef.current) {
            if (listenCooldownRef.current) clearTimeout(listenCooldownRef.current);
            listenCooldownRef.current = setTimeout(() => {
              listenCooldownRef.current = null;
              startListening();
            }, callLanguage === "hi" ? 650 : 250);
        }
      });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callLanguage]);

  // Start call - greet and begin
  useEffect(() => {
    if (callState === "connecting") {
      const timer = setTimeout(() => {
        setCallState("active");
        if (!speechRecognitionSupported) {
          setShowTextInput(true);
        }
        const greeting = callLanguage === "hi"
          ? `${character.shortName} बोल रहा हूँ। नमस्ते दोस्त! आज तुम मुझसे हिंदी में क्या पूछना चाहते हो?`
          : character.greeting;
        speak(greeting, () => {
          if (speechRecognitionSupported) {
            if (listenCooldownRef.current) clearTimeout(listenCooldownRef.current);
            listenCooldownRef.current = setTimeout(() => {
              listenCooldownRef.current = null;
              startListening();
            }, callLanguage === "hi" ? 650 : 250);
          }
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [callState, character.greeting, speak, startListening, speechRecognitionSupported, callLanguage]);

  // Call duration timer
  useEffect(() => {
    if (isCallActive && callState === "active") {
      timerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive, callState]);

  // Cleanup
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
      if (listenCooldownRef.current) clearTimeout(listenCooldownRef.current);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const endCall = async () => {
    setIsCallActive(false);
    setCallState("ended");
    window.speechSynthesis.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (listenCooldownRef.current) clearTimeout(listenCooldownRef.current);

    const bonusXP = Math.floor(callDuration / 60) * 10;
    if (bonusXP > 0) {
      await addXP(bonusXP);
      toast({
        title: "Call Complete! 📞",
        description: `+${bonusXP} bonus XP for ${Math.floor(callDuration / 60)} minutes of practice!`,
      });
    }
  };

  const getGradient = () => {
    switch (character.color) {
      case "orange": return "from-orange to-yellow";
      case "turquoise": return "from-turquoise to-primary";
      case "purple": return "from-purple to-pink";
      case "pink": return "from-pink to-primary";
      default: return "from-primary to-turquoise";
    }
  };

  // Call ended screen
  const conversationPairs = useMemo(() => {
    const pairs: { user: string; assistant: string }[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "user") {
        pairs.push({
          user: messages[i].content,
          assistant: messages[i + 1]?.role === "assistant" ? messages[i + 1].content : "",
        });
      }
    }
    return pairs;
  }, [messages]);

  // Extract notable vocabulary from assistant messages
  const learnedWords = useMemo(() => {
    const commonWords = new Set([
      "i", "me", "my", "you", "your", "we", "our", "they", "them", "their", "he", "she", "it",
      "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "can",
      "may", "might", "shall", "must", "need", "dare", "ought", "used",
      "and", "but", "or", "so", "if", "then", "than", "that", "this", "these", "those",
      "what", "which", "who", "whom", "where", "when", "why", "how",
      "not", "no", "yes", "all", "each", "every", "both", "few", "more", "most", "some",
      "any", "such", "only", "own", "same", "too", "very", "just", "also",
      "in", "on", "at", "to", "for", "with", "from", "by", "of", "about", "up", "out",
      "into", "over", "after", "before", "between", "under", "through",
      "here", "there", "now", "then", "well", "also", "back", "much", "even", "still",
      "go", "get", "got", "make", "like", "know", "think", "see", "come", "want",
      "say", "tell", "give", "take", "let", "put", "try", "ask", "look", "find",
      "call", "keep", "help", "talk", "turn", "show", "play", "run", "move", "live",
      "said", "dont", "im", "its", "thats", "lets", "ill", "youre", "were", "hes", "shes",
      "oh", "hi", "hey", "hello", "okay", "ok", "sure", "right", "yeah", "yep",
      "really", "thing", "things", "something", "anything", "nothing", "way", "day",
      "time", "good", "great", "new", "old", "big", "little", "first", "last",
      "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
      "beep", "boop", "meow", "hoo", "purr", "zap", "woosh",
    ]);

    const wordMap = new Map<string, string>();

    messages
      .filter((m) => m.role === "assistant")
      .forEach((m) => {
        const words = m.content
          .replace(/[^a-zA-Z\s'-]/g, "")
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !commonWords.has(w.toLowerCase()));

        words.forEach((w) => {
          const lower = w.toLowerCase();
          if (!wordMap.has(lower)) {
            // Find the sentence containing this word
            const sentences = m.content.split(/[.!?]+/).filter(Boolean);
            const context = sentences.find((s) => s.toLowerCase().includes(lower))?.trim() || "";
            wordMap.set(lower, context);
          }
        });
      });

    return Array.from(wordMap.entries())
      .slice(0, 8)
      .map(([word, context]) => ({ word: word.charAt(0).toUpperCase() + word.slice(1), context }));
  }, [messages]);

  const saveWordToFlashcards = async (word: string, context: string) => {
    if (!userId || savedWords.has(word)) return;
    setSavingWord(word);
    try {
      const { error } = await supabase.from("flashcards").insert({
        user_id: userId,
        word: word,
        definition: `Learned during a call with ${character.shortName}`,
        example_sentence: context || null,
      });
      if (error) throw error;
      setSavedWords((prev) => new Set(prev).add(word));
      toast({ title: "Saved! 📖", description: `"${word}" added to your flashcards!` });
    } catch {
      toast({ title: "Oops!", description: "Could not save the word. Try again!", variant: "destructive" });
    } finally {
      setSavingWord(null);
    }
  };

  const saveAllWords = async () => {
    if (!userId) return;
    const unsaved = learnedWords.filter(({ word }) => !savedWords.has(word));
    if (unsaved.length === 0) return;
    setSavingWord("all");
    try {
      const { error } = await supabase.from("flashcards").insert(
        unsaved.map(({ word, context }) => ({
          user_id: userId,
          word,
          definition: `Learned during a call with ${character.shortName}`,
          example_sentence: context || null,
        }))
      );
      if (error) throw error;
      setSavedWords((prev) => {
        const next = new Set(prev);
        unsaved.forEach(({ word }) => next.add(word));
        return next;
      });
      toast({ title: "All saved! 🎉", description: `${unsaved.length} words added to your flashcards!` });
    } catch {
      toast({ title: "Oops!", description: "Could not save words. Try again!", variant: "destructive" });
    } finally {
      setSavingWord(null);
    }
  };


  if (callState === "ended") {
    return (
      <div className="flex flex-col h-screen bg-background overflow-y-auto">
        <div className="flex flex-col items-center px-6 pt-12 pb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center w-full max-w-sm"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-5 border-4 border-muted shadow-lg">
              <img loading="lazy" decoding="async" src={character.image} alt={character.name} className="w-full h-full object-cover" />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              Call with {character.shortName}
            </h2>

            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow" />
                <span className="text-sm font-bold text-foreground">{formatDuration(callDuration)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">{messageCount} messages</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-6">Great practice session!</p>

            {/* New Words Learned */}
            {learnedWords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full mb-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      New Words Learned ({learnedWords.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={slowMode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSlowMode(!slowMode)}
                      className="text-xs h-7 px-2 gap-1"
                      title={slowMode ? "Slow mode on" : "Slow mode off"}
                    >
                      <Snail className="w-3 h-3" />
                      Slow
                    </Button>
                    {learnedWords.some(({ word }) => !savedWords.has(word)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={saveAllWords}
                        disabled={savingWord === "all"}
                        className="text-xs h-7 px-2"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Save All
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {learnedWords.map(({ word, context }) => {
                    const isSaved = savedWords.has(word);
                    return (
                      <div key={word} className="flex items-center gap-0.5">
                        <button
                          onClick={() => !isSaved && saveWordToFlashcards(word, context)}
                          disabled={isSaved || savingWord === word}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-full text-xs font-semibold border border-r-0 transition-colors ${
                            isSaved
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                          }`}
                        >
                          {isSaved ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          {word}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const utterance = new SpeechSynthesisUtterance(word);
                            utterance.rate = slowMode ? 0.4 : 0.8;
                            utterance.pitch = 1.1;
                            window.speechSynthesis.cancel();
                            window.speechSynthesis.speak(utterance);
                          }}
                          className={`flex items-center justify-center px-2 py-1.5 rounded-r-full text-xs border transition-colors ${
                            isSaved
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                          }`}
                          title={`Hear "${word}"`}
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {learnedWords.some(({ context }) => context) && (
                  <div className="mt-3 space-y-2 text-left rounded-xl bg-card border border-border p-3">
                    {learnedWords
                      .filter(({ context }) => context)
                      .slice(0, 4)
                      .map(({ word, context }) => (
                        <div key={word} className="flex items-start justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-primary">{word}</span>
                            <span className="text-muted-foreground"> — "{context}"</span>
                          </div>
                          {!savedWords.has(word) && (
                            <button
                              onClick={() => saveWordToFlashcards(word, context)}
                              disabled={savingWord === word}
                              className="shrink-0 text-primary hover:text-primary/80"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Pronunciation Quiz */}
            {learnedWords.length > 0 && (
              <PronunciationQuiz
                words={learnedWords}
                characterName={character.shortName}
                onComplete={async (correctCount) => {
                  const bonusXP = correctCount * 10;
                  if (bonusXP > 0) {
                    await addXP(bonusXP);
                    toast({
                      title: "Pronunciation Bonus! 🎤",
                      description: `+${bonusXP} XP for saying ${correctCount} word${correctCount > 1 ? "s" : ""} correctly!`,
                    });
                  }
                }}
              />
            )}

            {/* Conversation History */}
            {conversationPairs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full mb-6"
              >
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Conversation Recap ({conversationPairs.length} exchanges)
                  {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3 text-left max-h-[40vh] overflow-y-auto rounded-xl bg-card border border-border p-3">
                        {conversationPairs.map((pair, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex gap-2">
                              <span className="text-xs font-semibold text-primary mt-0.5 shrink-0">You:</span>
                              <p className="text-sm text-foreground">{pair.user}</p>
                            </div>
                            {pair.assistant && (
                              <div className="flex gap-2">
                                <span className="text-xs font-semibold text-muted-foreground mt-0.5 shrink-0">{character.shortName}:</span>
                                <p className="text-sm text-muted-foreground">{pair.assistant}</p>
                              </div>
                            )}
                            {i < conversationPairs.length - 1 && (
                              <div className="border-t border-border" />
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            <div className="space-y-3 w-full">
              <Button
                onClick={() => {
                  setCallState("connecting");
                  setIsCallActive(true);
                  setCallDuration(0);
                  setMessageCount(0);
                  setMessages([]);
                  setTranscript("");
                  setShowHistory(false);
                }}
                size="lg"
                className="rounded-full px-8 w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Again
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/call")}
                className="w-full rounded-full"
              >
                Choose Another Character
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Active call / connecting screen
  return (
    <div className={`flex flex-col min-h-screen bg-gradient-to-b ${getGradient()} relative overflow-y-auto`}>
      {/* Background animated rings */}
      <AnimatePresence>
        {isSpeaking && (
          <>
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                initial={{ scale: 0.8, opacity: 0.4 }}
                animate={{ scale: 1.5 + ring * 0.3, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 2, delay: ring * 0.4 }}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-white/30"
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10 gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              try { window.speechSynthesis.cancel(); } catch { /* noop */ }
              setIsSpeaking(false);
              stopListening();
              navigate("/call");
            }}
            className="rounded-full text-white hover:bg-white/20 h-9 w-9"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="text-white/80 text-sm font-medium">
            {callState === "connecting" ? "Connecting..." : formatDuration(callDuration)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              const next = callLanguage === "en" ? "hi" : "en";
              setCallLanguage(next);
              toast({
                title: next === "hi" ? "हिंदी मोड" : "English mode",
                description: next === "hi" ? "AI अब हिंदी में बात करेगा।" : "AI will now speak in English.",
              });
            }}
            className={`rounded-full h-10 px-3 gap-1.5 font-bold text-xs border-2 ${
              callLanguage === "hi"
                ? "bg-orange-500 text-white border-orange-300 hover:bg-orange-600"
                : "bg-blue-600 text-white border-blue-300 hover:bg-blue-700"
            }`}
            disabled={isLoading || callState === "connecting"}
            title={`AI will speak in ${LANGUAGE_OPTIONS[callLanguage].label}. Tap to switch.`}
          >
            <Languages className="w-4 h-4" />
            <span>{LANGUAGE_OPTIONS[callLanguage].label} mode</span>
          </Button>

          <VoiceTestButton
            voicePreferences={character.voicePreferences}
            rate={character.rate}
            pitch={character.pitch}
            className="h-10 rounded-full text-xs bg-white/10 text-white border-white/30 hover:bg-white/20"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSpeakEnabled(!speakEnabled)}
            className="rounded-full text-white hover:bg-white/20"
          >
            {speakEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
        </div>
      </div>


      {/* Center - Character avatar */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        {/* Avatar with pulsing ring */}
        <motion.div
          className="relative mb-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
        >
          {/* Pulsing ring when speaking */}
          {isSpeaking && (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute inset-0 rounded-full bg-white/20 -m-3"
            />
          )}
          {/* Listening indicator ring */}
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.1, 1], borderColor: ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.2)", "rgba(255,255,255,0.5)"] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute inset-0 rounded-full border-4 border-white/40 -m-3"
            />
          )}
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/50 shadow-2xl">
            <img loading="lazy" decoding="async" src={character.image} alt={character.name} className="w-full h-full object-cover" />
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-1">{character.shortName}</h2>
        <span className="text-white/70 text-sm mb-6">{character.level}</span>

        {/* Status indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/20 backdrop-blur-sm rounded-full px-5 py-2.5 mb-4"
        >
          {callState === "connecting" && (
            <div className="flex items-center gap-2">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 rounded-full bg-yellow" />
              <span className="text-white text-sm">Connecting...</span>
            </div>
          )}
          {callState === "active" && isLoading && (
            <div className="flex items-center gap-2">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-2 rounded-full bg-yellow" />
              <span className="text-white text-sm">{character.shortName} is thinking...</span>
            </div>
          )}
          {callState === "active" && isSpeaking && (
            <div className="flex items-center gap-2">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-2 h-2 rounded-full bg-green" />
              <span className="text-white text-sm">{character.shortName} is speaking</span>
            </div>
          )}
          {callState === "active" && isListening && (
            <div className="flex items-center gap-2">
              <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-white text-sm">Listening to you...</span>
            </div>
          )}
          {callState === "active" && !isSpeaking && !isListening && !isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <span className="text-white text-sm">
                {showTextInput ? "Type your message below" : speechRecognitionSupported ? "Tap mic to speak" : "Tap keyboard to type"}
              </span>
            </div>
          )}
        </motion.div>

        {/* Subtitle / transcript area */}
        <div className="min-h-[60px] max-w-sm text-center">
          <AnimatePresence mode="wait">
            {currentSubtitle && (
              <motion.p
                key="subtitle"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-white/90 text-sm leading-relaxed"
              >
                "{currentSubtitle}"
              </motion.p>
            )}
            {isListening && transcript && (
              <motion.p
                key="transcript"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/70 text-sm italic"
              >
                {transcript}...
              </motion.p>
            )}
            {!isListening && !currentSubtitle && micHint && (
              <motion.div
                key="michint"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <p className="text-white/80 text-sm">{micHint}</p>
                {retryCountdown > 0 && (
                  <motion.div
                    key={`countdown-${retryCountdown}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30"
                  >
                    <div className="relative w-5 h-5">
                      <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
                        <motion.circle
                          cx="10"
                          cy="10"
                          r="8"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 8}
                          initial={{ strokeDashoffset: 0 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 8 }}
                          transition={{ duration: 1, ease: "linear" }}
                        />
                      </svg>
                    </div>
                    <span className="text-white text-xs font-semibold tabular-nums">
                      Retrying in {retryCountdown}s
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* XP bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="px-6 pb-2 relative z-10"
      >
        <div className="flex items-center gap-2 justify-center">
          <Trophy className="w-4 h-4 text-white/70" />
          <span className="text-xs text-white/70">
            {3 - (messageCount % 3)} more exchanges for 15 XP
          </span>
        </div>
      </motion.div>

      {/* Text input area */}
      <AnimatePresence>
        {showTextInput && callState === "active" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-2 relative z-10"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && textInput.trim() && !isLoading) {
                    sendToAI(textInput.trim());
                    setTextInput("");
                  }
                }}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-full bg-white/20 text-white placeholder:text-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 text-sm backdrop-blur-sm disabled:opacity-50"
              />
              <Button
                size="icon"
                className="rounded-full w-12 h-12 bg-white/20 text-white hover:bg-white/30 border border-white/30"
                disabled={!textInput.trim() || isLoading}
                onClick={() => {
                  if (textInput.trim()) {
                    sendToAI(textInput.trim());
                    setTextInput("");
                  }
                }}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-8 pb-12 pt-4 relative z-10">
        {/* Keyboard toggle */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            size="icon"
            className={`rounded-full w-14 h-14 shadow-lg transition-colors ${
              showTextInput
                ? "bg-white text-primary hover:bg-white/90"
                : "bg-white/20 text-white hover:bg-white/30 border border-white/30"
            }`}
            onClick={() => {
              const next = !showTextInput;
              setShowTextInput(next);
              if (next) {
                // Switching to keyboard: hard-stop mic and prevent auto-restart
                userStoppedRef.current = true;
                manualStopRef.current = true;
                stopListening();
              } else {
                userStoppedRef.current = false;
                manualStopRef.current = false;
              }
            }}
            disabled={callState === "connecting"}
          >
            <Keyboard className="w-6 h-6" />
          </Button>
        </motion.div>

        {/* Stop speaking button - only when AI is speaking */}
        {isSpeaking && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              size="icon"
              className="rounded-full w-14 h-14 bg-white text-destructive hover:bg-white/90 shadow-lg border-2 border-white/60"
              onClick={() => {
                try { window.speechSynthesis.cancel(); } catch { /* noop */ }
                setIsSpeaking(false);
                isSpeakingRef.current = false;
                resetAudioFallback();
              }}
              aria-label="Stop speaking"
              title="Stop speaking"
            >
              <Square className="w-6 h-6 fill-current" />
            </Button>
          </motion.div>
        )}

        {/* Mic button - only show if speech recognition is supported */}
        {speechRecognitionSupported && (
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              className={`rounded-full w-16 h-16 shadow-lg transition-colors ${
                isListening
                  ? "bg-white text-destructive hover:bg-white/90"
                  : "bg-white/20 text-white hover:bg-white/30 border border-white/30"
              }`}
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  setShowTextInput(false);
                  startListening();
                }
              }}
              disabled={isLoading || callState === "connecting"}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </Button>
          </motion.div>
        )}

        {/* End call button */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            size="icon"
            className="rounded-full w-16 h-16 bg-destructive hover:bg-destructive/90 shadow-lg"
            onClick={endCall}
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default AICharacterChat;
