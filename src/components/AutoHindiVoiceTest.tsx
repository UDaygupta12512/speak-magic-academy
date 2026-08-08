import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { speakHQ, primeVoices, isFallbackActive } from "@/lib/hqSpeech";
import { streamChat } from "@/lib/streamChat";
import { emitCallDebug, detectScriptLang } from "@/lib/callDebugBus";
import { toast } from "@/hooks/use-toast";

const RECORD_SECONDS = 10;

type Phase = "idle" | "recording" | "thinking" | "playing" | "done" | "error";

/**
 * Automated Hindi voice test:
 *   1. Records 10 seconds of speech (Web Speech, hi-IN)
 *   2. Shows the live Hindi transcription
 *   3. Generates a short Hindi reply via streamChat
 *   4. Speaks the reply with the Hindi TTS voice
 *   5. Logs every step into the Call Debug Panel + reports if the voice
 *      fallback engaged.
 */
const AutoHindiVoiceTest = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");

  const supported =
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ("SpeechRecognition" in (window as any) || "webkitSpeechRecognition" in (window as any));

  useEffect(() => {
    primeVoices();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      try { recRef.current?.abort(); } catch { /* noop */ }
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
  }, []);

  const speakReply = (text: string) => {
    setPhase("playing");
    speakHQ(text, {
      lang: "hi",
      rate: 0.95,
      pitch: 1,
      volume: 1,
      onVoiceSelected: (info) => {
        emitCallDebug({
          type: "tts-start",
          lang: "hi",
          voiceName: info.name,
          voiceLang: info.lang,
          rate: info.rate,
          chunkPreview: text.slice(0, 60),
        });
      },
      onFallbackEngaged: () => {
        setFallbackUsed(true);
        emitCallDebug({ type: "tts-fallback", lang: "hi" });
      },
      onEnd: () => {
        emitCallDebug({ type: "tts-end" });
        if (isFallbackActive("hi")) setFallbackUsed(true);
        setPhase("done");
      },
      onError: (msg) => {
        emitCallDebug({ type: "tts-error", message: msg });
        setErrorMsg("TTS playback failed");
        setPhase("error");
      },
    });
  };

  const generateReply = async (userText: string) => {
    setPhase("thinking");
    setReply("");
    let acc = "";
    try {
      await streamChat({
        messages: [{ role: "user", content: userText }],
        activityType: "ai_call_hi",
        systemPrompt:
          "तुम एक मित्रवत हिंदी ट्यूटर हो। बच्चे की बात का छोटा (1-2 वाक्य), सरल, उत्साही उत्तर सिर्फ़ देवनागरी हिंदी में दो। कोई इमोजी या मार्कडाउन नहीं।",
        onDelta: (chunk) => { acc += chunk; },
        onDone: () => {
          if (!acc.trim()) {
            acc = "बहुत बढ़िया! आपने हिंदी में अच्छा बोला।";
          } else if (!/[\u0900-\u097F]/.test(acc)) {
            acc = "बहुत बढ़िया! आपने हिंदी में अच्छा बोला।";
          }
          setReply(acc);
          speakReply(acc);
        },
        onError: () => {
          const fallback = "बहुत बढ़िया! आपने हिंदी में अच्छा बोला।";
          setReply(fallback);
          speakReply(fallback);
        },
      });
    } catch {
      const fallback = "बहुत बढ़िया! आपने हिंदी में अच्छा बोला।";
      setReply(fallback);
      speakReply(fallback);
    }
  };

  const start = () => {
    if (!supported) {
      toast({
        title: "Not supported",
        description: "Speech recognition isn't available in this browser. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }
    setErrorMsg(null);
    setTranscript("");
    setReply("");
    setFallbackUsed(false);
    finalRef.current = "";
    interimRef.current = "";
    setSecondsLeft(RECORD_SECONDS);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      setPhase("recording");
      emitCallDebug({ type: "stt-start", lang: "hi-IN", continuous: true, maxAlternatives: 3 });
    };
    rec.onresult = (event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      interimRef.current = "";
      let lastFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) {
          finalRef.current += t + " ";
          lastFinal = t;
        } else {
          interimRef.current += t;
        }
      }
      const combined = (finalRef.current + interimRef.current).trim();
      setTranscript(combined);
      const sample = (lastFinal || interimRef.current).trim();
      if (sample) {
        emitCallDebug({
          type: "stt-result",
          text: sample,
          isFinal: !!lastFinal,
          detectedLang: detectScriptLang(sample),
        });
      }
    };
    rec.onerror = (e: { error?: string; message?: string }) => {
      const err = e?.error || "unknown";
      emitCallDebug({ type: "stt-error", error: err, message: e?.message });
      if (err === "no-speech") setErrorMsg("कोई आवाज़ नहीं सुनाई दी। फिर से कोशिश करें।");
      else if (err === "not-allowed" || err === "service-not-allowed") setErrorMsg("Microphone permission blocked.");
      else if (err === "audio-capture") setErrorMsg("No microphone detected.");
      else setErrorMsg(`Speech error: ${err}`);
      setPhase("error");
    };
    rec.onend = () => {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
      const text = (finalRef.current + interimRef.current).trim();
      emitCallDebug({ type: "stt-end", finalText: text });
      if (!text) {
        if (phase !== "error") {
          setErrorMsg("कोई शब्द नहीं पहचाने गए। कृपया फिर से बोलें।");
          setPhase("error");
        }
        return;
      }
      setTranscript(text);
      generateReply(text);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setErrorMsg("Could not start microphone.");
      setPhase("error");
      return;
    }

    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    stopTimerRef.current = setTimeout(() => {
      try { rec.stop(); } catch { /* noop */ }
    }, RECORD_SECONDS * 1000);
  };

  const stop = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    try { recRef.current?.stop(); } catch { /* noop */ }
  };

  const recording = phase === "recording";

  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 backdrop-blur p-3 text-white text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto Hindi Voice Test</span>
        </div>
        {recording ? (
          <Button type="button" size="sm" variant="destructive" className="rounded-full h-8" onClick={stop}>
            <Square className="w-3.5 h-3.5 mr-1" /> Stop ({secondsLeft}s)
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="rounded-full h-8 bg-orange-500 hover:bg-orange-600 text-white"
            disabled={phase === "thinking" || phase === "playing"}
            onClick={start}
          >
            {phase === "thinking" || phase === "playing" ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Mic className="w-3.5 h-3.5 mr-1" />
            )}
            {phase === "playing" ? "Playing…" : phase === "thinking" ? "Thinking…" : `Run test (${RECORD_SECONDS}s)`}
          </Button>
        )}
      </div>

      {(transcript || recording) && (
        <div lang="hi" className="rounded-lg bg-black/30 px-2 py-1.5 min-h-[30px] text-white/95 font-medium">
          <span className="text-white/60 mr-1">You:</span>
          {transcript || (recording ? "सुन रहा हूँ…" : "")}
        </div>
      )}

      {reply && (
        <div lang="hi" className="rounded-lg bg-emerald-500/20 border border-emerald-300/30 px-2 py-1.5 text-white">
          <span className="text-emerald-200 mr-1">AI:</span>{reply}
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-emerald-200">
            STT + TTS OK{fallbackUsed ? " — fallback voice used" : " — native Hindi voice"}
          </span>
        </div>
      )}

      {phase === "error" && errorMsg && (
        <div className="flex items-start gap-1 text-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default AutoHindiVoiceTest;
