// High-quality Web Speech TTS helpers.
// Strategy:
//  - Prefer neural / premium / network / cloud voices when the OS exposes them.
//  - Fall back through a curated list of known high-quality voice names
//    (Google, Microsoft Online Natural, Apple "Enhanced/Premium").
//  - Split long text into sentence-sized chunks. Browser engines often
//    distort or truncate utterances longer than ~200 chars; chunking gives
//    clearer prosody and lets us pace pauses between sentences.
//  - Clamp rate/pitch/volume to safe, intelligible ranges.

export type Lang = "en" | "hi";

const HIGH_QUALITY_HINTS = [
  "neural",
  "natural",
  "premium",
  "enhanced",
  "online",
  "wavenet",
  "studio",
  "google",
  "microsoft",
];

const LOW_QUALITY_HINTS = ["espeak", "compact", "eloquence", "novelty"];

const HINDI_PREFERRED = [
  "Microsoft Swara Online",
  "Microsoft Madhur Online",
  "Google हिन्दी",
  "Google Hindi",
  "Microsoft Hemant",
  "Microsoft Kalpana",
  "Lekha",
  "Kalpana",
];

const ENGLISH_PREFERRED = [
  "Microsoft Aria Online",
  "Microsoft Jenny Online",
  "Microsoft Guy Online",
  "Microsoft Ryan Online",
  "Google UK English Female",
  "Google UK English Male",
  "Google US English",
  "Samantha (Enhanced)",
  "Samantha",
  "Karen",
  "Daniel",
];

let cachedVoices: SpeechSynthesisVoice[] = [];

// Audio-quality fallback state. When the browser repeatedly errors out, cuts
// utterances short, or skips chunks, we automatically:
//   1. Drop to a known-stable voice (the OS default for the language)
//   2. Slow the speaking rate by ~20% to reduce distortion / clipping
// The decision persists for the rest of the session so it stays stable.
type FallbackState = {
  active: boolean;
  failures: number; // counts errors AND suspicious early-cutoffs
};
const fallbackState: Record<Lang, FallbackState> = {
  en: { active: false, failures: 0 },
  hi: { active: false, failures: 0 },
};
const FALLBACK_FAILURE_THRESHOLD = 2;

export function isFallbackActive(lang: Lang): boolean {
  return fallbackState[lang].active;
}

export function resetAudioFallback(lang?: Lang) {
  if (lang) {
    fallbackState[lang] = { active: false, failures: 0 };
  } else {
    fallbackState.en = { active: false, failures: 0 };
    fallbackState.hi = { active: false, failures: 0 };
  }
}

function recordFailure(lang: Lang, onFallbackEngaged?: () => void) {
  const st = fallbackState[lang];
  st.failures += 1;
  if (!st.active && st.failures >= FALLBACK_FAILURE_THRESHOLD) {
    st.active = true;
    console.warn(`[hqSpeech] Audio fallback engaged for ${lang} after ${st.failures} issues.`);
    onFallbackEngaged?.();
  }
}

function pickStableVoice(lang: Lang): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (!voices.length) return null;
  const langPrefix = lang === "hi" ? "hi" : "en";
  const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  // For Hindi, never fall back to an English/default voice. If the browser has
  // no exposed Hindi voice, leaving utterance.voice unset lets the engine route
  // by utterance.lang = hi-IN instead of forcing English phonetics.
  if (lang === "hi") return inLang.find((v) => v.default) ?? inLang[0] ?? null;
  // Prefer the OS default voice (most stable), else the first in-language voice.
  return inLang.find((v) => v.default) ?? inLang[0] ?? voices.find((v) => v.default) ?? voices[0];
}

export function primeVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  cachedVoices = window.speechSynthesis.getVoices();
  if (cachedVoices.length === 0) {
    // Some browsers populate voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
}

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const live = window.speechSynthesis.getVoices();
  if (live.length) cachedVoices = live;
  return cachedVoices;
}

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  for (const h of HIGH_QUALITY_HINTS) if (name.includes(h)) score += 10;
  for (const h of LOW_QUALITY_HINTS) if (name.includes(h)) score -= 20;
  // Apple flags premium voices via "(Enhanced)" / "(Premium)"
  if (name.includes("(premium)")) score += 15;
  if (name.includes("(enhanced)")) score += 8;
  // Slightly prefer non-default (default is often the basic system voice)
  if (!v.default) score += 1;
  return score;
}

export function pickBestVoice(
  lang: Lang,
  customPreferences?: string[]
): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (!voices.length) return null;

  const langPrefix = lang === "hi" ? "hi" : "en";
  const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (lang === "hi" && !inLang.length) return null;
  const pool = inLang.length ? inLang : voices;

  // 1. Honour explicit character preferences first (exact-ish match).
  const prefs = [
    ...(customPreferences ?? []),
    ...(lang === "hi" ? HINDI_PREFERRED : ENGLISH_PREFERRED),
  ];
  for (const pref of prefs) {
    const p = pref.toLowerCase();
    const hit = pool.find((v) => v.name.toLowerCase().includes(p));
    if (hit) return hit;
  }

  // 2. Otherwise rank by quality score.
  const ranked = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return ranked[0] ?? voices[0] ?? null;
}

function chunkText(text: string, maxLen = 180): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return [clean];
  // Split on sentence boundaries first, then pack into chunks.
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [clean];
  const chunks: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((buf + " " + piece).trim().length > maxLen) {
      if (buf) chunks.push(buf.trim());
      if (piece.length > maxLen) {
        // Hard wrap on commas / spaces for very long sentences.
        const parts = piece.split(/,\s+/);
        let sub = "";
        for (const part of parts) {
          if ((sub + ", " + part).length > maxLen) {
            if (sub) chunks.push(sub.trim());
            sub = part;
          } else {
            sub = sub ? `${sub}, ${part}` : part;
          }
        }
        if (sub) chunks.push(sub.trim());
        buf = "";
      } else {
        buf = piece;
      }
    } else {
      buf = buf ? `${buf} ${piece}` : piece;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

export interface SpeakHQOptions {
  lang?: Lang;
  rate?: number; // 0.5 - 1.4 recommended
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
  voicePreferences?: string[];
  voice?: SpeechSynthesisVoice | null;
  onStart?: (chunk: string, index: number) => void;
  onEnd?: () => void;
  onError?: (message?: string) => void;
  /** Called the first time the engine drops to fallback voice/rate this session. */
  onFallbackEngaged?: () => void;
  /** Called once the active voice is resolved (or null if browser will route by lang). */
  onVoiceSelected?: (info: { name: string | null; lang: string | null; rate: number; fallback: boolean }) => void;
}

/**
 * High-quality speak() — chunks long text and uses the best available voice.
 * Returns a stop() function you can call to cancel mid-speech.
 *
 * Includes an automatic audio-quality fallback: if utterances repeatedly
 * error or get cut off mid-sentence, subsequent calls will switch to the
 * device's stable default voice and reduce the rate by ~20%.
 */
export function speakHQ(text: string, opts: SpeakHQOptions = {}): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    opts.onError?.();
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const lang = opts.lang ?? "en";
  const fallback = isFallbackActive(lang);
  const baseRate = opts.rate ?? 0.95;
  const adjustedRate = fallback ? baseRate * 0.8 : baseRate;
  const rate = Math.max(0.5, Math.min(1.4, adjustedRate));
  const pitch = Math.max(0, Math.min(2, opts.pitch ?? 1));
  const volume = Math.max(0, Math.min(1, opts.volume ?? 1));
  let activeVoice = fallback
    ? pickStableVoice(lang)
    : (opts.voice ?? pickBestVoice(lang, opts.voicePreferences));
  let retriedHindiWithoutVoice = false;

  opts.onVoiceSelected?.({
    name: activeVoice?.name ?? null,
    lang: activeVoice?.lang ?? (lang === "hi" ? "hi-IN" : "en-US"),
    rate,
    fallback,
  });

  const chunks = chunkText(text);
  if (!chunks.length) {
    opts.onEnd?.();
    return () => {};
  }

  let cancelled = false;
  let i = 0;

  const speakNext = () => {
    if (cancelled) return;
    if (i >= chunks.length) {
      opts.onEnd?.();
      return;
    }
    const chunk = chunks[i];
    const u = new SpeechSynthesisUtterance(chunk);
    u.rate = rate;
    u.pitch = pitch;
    u.volume = volume;
    u.lang = lang === "hi" ? "hi-IN" : "en-US";
    if (activeVoice) u.voice = activeVoice;

    u.onstart = () => {
      opts.onStart?.(chunk, i);
    };
    u.onend = () => {
      i += 1;
      speakNext();
    };
    u.onerror = (event) => {
      const errorName = typeof event?.error === "string" ? event.error : "";
      if (errorName === "canceled" || errorName === "interrupted") {
        cancelled = true;
        return;
      }
      if (lang === "hi" && activeVoice && !retriedHindiWithoutVoice) {
        retriedHindiWithoutVoice = true;
        activeVoice = null;
        window.setTimeout(speakNext, 80);
        return;
      }
      recordFailure(lang, opts.onFallbackEngaged);
      cancelled = true;
      opts.onError?.(errorName || "speech-error");
    };
    synth.speak(u);
  };

  speakNext();

  return () => {
    cancelled = true;
    synth.cancel();
  };
}
