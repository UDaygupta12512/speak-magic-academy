import { useCallback } from "react";

type FeedbackType = "tap" | "success" | "error" | "navigation";

const STORAGE_KEY = "speakgenie_sound_enabled";

export const isSoundEnabled = (): boolean => {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val !== "false";
  } catch {
    return true;
  }
};

export const setSoundEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {}
};

const SOUND_CONFIG: Record<FeedbackType, { freq: number; duration: number; type: OscillatorType; gain: number }> = {
  tap: { freq: 600, duration: 0.06, type: "sine", gain: 0.08 },
  success: { freq: 880, duration: 0.12, type: "triangle", gain: 0.1 },
  error: { freq: 220, duration: 0.15, type: "square", gain: 0.06 },
  navigation: { freq: 500, duration: 0.05, type: "sine", gain: 0.05 },
};

let audioCtx: AudioContext | null = null;

const getAudioCtx = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

const playTone = (type: FeedbackType) => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioCtx();
    const cfg = SOUND_CONFIG[type];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cfg.type;
    osc.frequency.value = cfg.freq;
    gain.gain.setValueAtTime(cfg.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + cfg.duration);

    if (type === "success") {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.value = 1320;
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.2);
    }
  } catch {}
};

const triggerHaptic = (type: FeedbackType) => {
  if (!isSoundEnabled()) return;
  if (!navigator.vibrate) return;
  switch (type) {
    case "tap": navigator.vibrate(10); break;
    case "success": navigator.vibrate([15, 50, 15]); break;
    case "error": navigator.vibrate([30, 20, 30]); break;
    case "navigation": navigator.vibrate(8); break;
  }
};

export const fireFeedback = (type: FeedbackType = "tap") => {
  triggerHaptic(type);
  playTone(type);
};

export const useFeedback = () => {
  const feedback = useCallback((type: FeedbackType = "tap") => {
    fireFeedback(type);
  }, []);

  return feedback;
};
