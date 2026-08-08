import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Volume2, CheckCircle2, AlertTriangle } from "lucide-react";
import { speakHQ, primeVoices } from "@/lib/hqSpeech";
import { toast } from "@/hooks/use-toast";

const RECORD_SECONDS = 10;

type Phase = "idle" | "recording" | "thinking" | "playing" | "done" | "error";

/**
 * Quick 10-second Hindi voice check. Records via Web Speech Recognition (hi-IN),
 * shows the live transcript, then speaks it back with the Hindi TTS voice so the
 * user can verify both microphone STT and synthesized reply quality before
 * starting an AI call.
 */
const HindiVoiceCheck = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
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
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
    };
  }, []);

  const playback = (text: string) => {
    setPhase("playing");
    speakHQ(text, {
      lang: "hi",
      rate: 0.95,
      pitch: 1,
      volume: 1,
      onEnd: () => setPhase("done"),
      onError: () => {
        setErrorMsg("TTS playback failed");
        setPhase("error");
      },
    });
  };

  const stopRecording = (autoSend: boolean) => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    if (!autoSend) setPhase("idle");
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

    rec.onstart = () => setPhase("recording");
    rec.onresult = (event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      interimRef.current = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalRef.current += t + " ";
        else interimRef.current += t;
      }
      setTranscript((finalRef.current + interimRef.current).trim());
    };
    rec.onerror = (e: { error?: string }) => {
      const err = e?.error || "unknown";
      if (err === "no-speech") {
        setErrorMsg("कोई आवाज़ नहीं सुनाई दी। माइक के पास बोलें और दोबारा कोशिश करें।");
      } else if (err === "not-allowed" || err === "service-not-allowed") {
        setErrorMsg("Microphone permission blocked. Allow mic access and retry.");
      } else if (err === "audio-capture") {
        setErrorMsg("No microphone detected.");
      } else {
        setErrorMsg(`Speech error: ${err}`);
      }
      setPhase("error");
    };
    rec.onend = () => {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
      const text = (finalRef.current + interimRef.current).trim();
      if (!text) {
        if (phase !== "error") {
          setErrorMsg("कोई शब्द नहीं पहचाने गए। कृपया फिर से बोलें।");
          setPhase("error");
        }
        return;
      }
      setTranscript(text);
      setPhase("thinking");
      // small delay so UI updates before TTS starts
      setTimeout(() => playback(text), 200);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setErrorMsg("Could not start microphone.");
      setPhase("error");
      return;
    }

    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    stopTimerRef.current = setTimeout(() => {
      try { rec.stop(); } catch { /* noop */ }
    }, RECORD_SECONDS * 1000);
  };

  const replay = () => {
    if (!transcript) return;
    playback(transcript);
  };

  const recording = phase === "recording";

  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 backdrop-blur p-3 text-white text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold flex items-center gap-1.5">
          <span className="text-sm">🎙️</span>
          <span>हिंदी Voice Check</span>
        </div>
        {recording ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="rounded-full h-8"
            onClick={() => stopRecording(true)}
          >
            <Square className="w-3.5 h-3.5 mr-1" />
            Stop ({secondsLeft}s)
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
            {phase === "playing" ? "Playing…" : phase === "thinking" ? "…" : `Speak Hindi (${RECORD_SECONDS}s)`}
          </Button>
        )}
      </div>

      {(transcript || recording) && (
        <div className="rounded-lg bg-black/30 px-2 py-1.5 min-h-[32px] text-white/95 font-medium" lang="hi">
          {transcript || (recording ? "सुन रहा हूँ…" : "")}
        </div>
      )}

      {phase === "done" && transcript && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>STT + TTS OK</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full h-7 text-[11px] bg-white/10 border-white/30 text-white hover:bg-white/20"
            onClick={replay}
          >
            <Volume2 className="w-3.5 h-3.5 mr-1" />
            Replay
          </Button>
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

export default HindiVoiceCheck;
