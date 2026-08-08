import { useEffect, useState } from "react";

export interface LastActivity {
  label: string;
  path: string;
  emoji: string;
  timestamp: number;
}

const KEY = "speakgenie_last_activity";
const RESUME_KEY = "speakgenie_resume_context";

type ResumeMap = Record<string, Record<string, string>>;

const readResumeMap = (): ResumeMap => {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as ResumeMap) : {};
  } catch {
    return {};
  }
};

/**
 * Stores the parameters needed to re-open an activity exactly where the child
 * left off (quiz level/question, comic language, etc.). These get appended to
 * /learn deep links so one click resumes the lesson.
 */
export function saveResumeContext(basePath: string, params: Record<string, string | number | null | undefined>) {
  try {
    const map = readResumeMap();
    const clean: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") clean[k] = String(v);
    });
    if (Object.keys(clean).length === 0) {
      delete map[basePath];
    } else {
      map[basePath] = clean;
    }
    localStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

export function clearResumeContext(basePath: string) {
  saveResumeContext(basePath, {});
}

export function getResumeContext(basePath: string): Record<string, string> | null {
  const map = readResumeMap();
  return map[basePath] ?? null;
}

/** Returns `basePath` with any stored resume parameters appended. */
export function resumeLink(basePath: string): string {
  const ctx = getResumeContext(basePath);
  if (!ctx) return basePath;
  const qs = new URLSearchParams(ctx).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function trackActivity(label: string, path: string, emoji = "📘") {
  try {
    const entry: LastActivity = { label, path, emoji, timestamp: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(entry));
    window.dispatchEvent(new CustomEvent("speakgenie:activity", { detail: entry }));
  } catch {
    /* storage unavailable */
  }
}

export function useLastActivity(): LastActivity | null {
  const [activity, setActivity] = useState<LastActivity | null>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as LastActivity;
      if (detail) setActivity(detail);
    };
    window.addEventListener("speakgenie:activity", handler);
    const storage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try { setActivity(JSON.parse(e.newValue)); } catch { /* ignore bad JSON */ }
      }
    };
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("speakgenie:activity", handler);
      window.removeEventListener("storage", storage);
    };
  }, []);

  return activity;
}
