// Lightweight event bus for the Hindi Call Debug Panel.
// Components emit named debug events; the panel subscribes and renders them.

export type CallDebugEvent =
  | { type: "stt-start"; lang: string; continuous: boolean; maxAlternatives: number }
  | { type: "stt-result"; text: string; isFinal: boolean; detectedLang: "hi" | "en" | "mixed" | "unknown" }
  | { type: "stt-end"; finalText: string }
  | { type: "stt-error"; error: string; message?: string }
  | { type: "tts-start"; lang: string; voiceName: string | null; voiceLang: string | null; rate: number; chunkPreview: string }
  | { type: "tts-end" }
  | { type: "tts-error"; message?: string }
  | { type: "tts-fallback"; lang: string }
  | { type: "info"; message: string };

export type CallDebugEntry = CallDebugEvent & { ts: number };

const CHANNEL = "speakgenie:call-debug";

export function emitCallDebug(event: CallDebugEvent) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent<CallDebugEntry>(CHANNEL, { detail: { ...event, ts: Date.now() } }));
  } catch {
    /* noop */
  }
}

export function onCallDebug(cb: (entry: CallDebugEntry) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<CallDebugEntry>).detail);
  window.addEventListener(CHANNEL, handler as EventListener);
  return () => window.removeEventListener(CHANNEL, handler as EventListener);
}

export function detectScriptLang(text: string): "hi" | "en" | "mixed" | "unknown" {
  const trimmed = text.trim();
  if (!trimmed) return "unknown";
  const hasDeva = /[\u0900-\u097F]/.test(trimmed);
  const hasLatin = /[A-Za-z]/.test(trimmed);
  if (hasDeva && hasLatin) return "mixed";
  if (hasDeva) return "hi";
  if (hasLatin) return "en";
  return "unknown";
}
