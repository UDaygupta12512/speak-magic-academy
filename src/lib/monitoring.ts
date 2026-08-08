/**
 * Lightweight client error monitoring.
 *
 * Captures uncaught errors and unhandled promise rejections into a small
 * rolling buffer in localStorage so issues reported by kids/parents can be
 * inspected later, and logs them to the console for live debugging.
 * Deliberately dependency-free — no third-party SDK, no PII collected.
 */

const KEY = "speakgenie_error_log";
const MAX_ENTRIES = 25;

export interface LoggedError {
  at: string;
  kind: "error" | "unhandledrejection" | "react";
  message: string;
  source?: string;
  stack?: string;
}

export const readErrorLog = (): LoggedError[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LoggedError[]) : [];
  } catch {
    return [];
  }
};

export const logError = (entry: Omit<LoggedError, "at">) => {
  const record: LoggedError = { ...entry, at: new Date().toISOString() };
  // Truncate stacks so the buffer can never blow the localStorage quota.
  if (record.stack) record.stack = record.stack.slice(0, 1500);
  try {
    const next = [record, ...readErrorLog()].slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — console log below is still useful */
  }
  console.error(`[monitor:${record.kind}]`, record.message, record.source ?? "");
};

export const clearErrorLog = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

let installed = false;

export const initMonitoring = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    logError({
      kind: "error",
      message: e.message || "Unknown error",
      source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined,
      stack: e.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason: unknown = e.reason;
    logError({
      kind: "unhandledrejection",
      message:
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unhandled promise rejection",
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
};
