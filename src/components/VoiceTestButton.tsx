import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { speakHQ, isFallbackActive, type Lang } from "@/lib/hqSpeech";
import { toast } from "@/hooks/use-toast";

const SAMPLES: Record<Lang, string> = {
  en: "Hi! This is a quick voice test. Can you hear me clearly?",
  hi: "नमस्ते! यह एक छोटा सा वॉइस टेस्ट है। क्या आप मुझे साफ़ सुन सकते हैं?",
};

interface Props {
  /** Languages to test in sequence. Defaults to both. */
  langs?: Lang[];
  /** Optional voice preferences passed to speakHQ (e.g. character voices). */
  voicePreferences?: string[];
  rate?: number;
  pitch?: number;
  className?: string;
}

/**
 * "Run voice test" button — plays a short sample in each requested language
 * and reports back whether the audio engine succeeded, engaged the stable
 * fallback, or failed entirely. Use before starting a Call or Roleplay.
 */
const VoiceTestButton = ({
  langs = ["en", "hi"],
  voicePreferences,
  rate,
  pitch,
  className,
}: Props) => {
  const [state, setState] = useState<"idle" | "playing" | "ok" | "fallback" | "error">("idle");
  const [currentLang, setCurrentLang] = useState<Lang | null>(null);

  const runTest = async () => {
    if (state === "playing") return;
    setState("playing");
    let hadError = false;
    let usedFallback = false;

    for (const lang of langs) {
      setCurrentLang(lang);
      const ok = await new Promise<boolean>((resolve) => {
        speakHQ(SAMPLES[lang], {
          lang,
          rate,
          pitch,
          volume: 1,
          voicePreferences,
          onFallbackEngaged: () => {
            usedFallback = true;
          },
          onEnd: () => resolve(true),
          onError: () => {
            hadError = true;
            resolve(false);
          },
        });
      });
      if (!ok) break;
      if (isFallbackActive(lang)) usedFallback = true;
    }

    setCurrentLang(null);

    if (hadError) {
      setState("error");
      toast({
        title: "Voice test failed",
        description: "Your browser couldn't play the sample. Check sound settings or try a different browser.",
        variant: "destructive",
      });
    } else if (usedFallback) {
      setState("fallback");
      toast({
        title: "Voice tuned for clarity 🎚️",
        description: "Switched to a more stable voice and slower pace for your device.",
      });
    } else {
      setState("ok");
      toast({
        title: "Voice test passed ✅",
        description: "Audio sounds good — you're ready to talk!",
      });
    }
  };

  const Icon =
    state === "playing" ? Loader2 :
    state === "ok" ? CheckCircle2 :
    state === "fallback" ? CheckCircle2 :
    state === "error" ? AlertTriangle :
    Volume2;

  const label =
    state === "playing"
      ? `Testing ${currentLang === "hi" ? "Hindi" : currentLang === "en" ? "English" : "voice"}…`
      : state === "ok"
      ? "Voice OK — tap to retest"
      : state === "fallback"
      ? "Tuned for clarity — retest"
      : state === "error"
      ? "Test failed — retry"
      : "Run voice test";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={runTest}
      disabled={state === "playing"}
      className={className}
      aria-live="polite"
    >
      <Icon className={`w-4 h-4 mr-1.5 ${state === "playing" ? "animate-spin" : ""}`} />
      {label}
    </Button>
  );
};

export default VoiceTestButton;
