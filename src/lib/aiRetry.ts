// Auto-retry helper for AI calls that fail with HTTP 402 (credits exhausted)
// or 429 (rate limit). Re-runs the request periodically until it succeeds or
// the caller cancels. Used by the Comic generator and the AI Call so the
// flow resumes automatically as soon as credits are topped up.

export type RetryStatus =
  | { phase: "waiting"; attempt: number; nextRetryInSec: number; reason: "credits" | "rate-limit" }
  | { phase: "retrying"; attempt: number }
  | { phase: "success" }
  | { phase: "failed"; error: unknown };

export interface RetryOptions {
  maxAttempts?: number;          // total attempts including the first one
  initialDelayMs?: number;       // delay before first retry
  maxDelayMs?: number;           // cap for backoff
  onStatus?: (s: RetryStatus) => void;
  signal?: AbortSignal;          // cancel pending retries
}

// Detect 402 / 429 from either a supabase FunctionsHttpError or a plain fetch Response/Error
export function classifyAiError(err: unknown): "credits" | "rate-limit" | "other" {
  if (!err) return "other";
  // supabase-js FunctionsHttpError carries the upstream Response on .context
  const ctx = (err as { context?: { status?: number } }).context;
  const status = ctx?.status ?? (err as { status?: number }).status;
  if (status === 402) return "credits";
  if (status === 429) return "rate-limit";
  const msg = (err as Error)?.message?.toLowerCase() ?? "";
  if (msg.includes("credit")) return "credits";
  if (msg.includes("rate") || msg.includes("too many")) return "rate-limit";
  return "other";
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Run `fn` and, when it fails with 402/429, retry with exponential backoff.
 * Other errors are thrown immediately. Returns the successful result.
 */
export async function retryUntilCredits<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 8,
    initialDelayMs = 30_000,
    maxDelayMs = 180_000,
    onStatus,
    signal,
  } = opts;

  let attempt = 0;
  let delay = initialDelayMs;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    attempt++;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      if (attempt > 1) onStatus?.({ phase: "retrying", attempt });
      const result = await fn();
      onStatus?.({ phase: "success" });
      return result;
    } catch (err) {
      lastError = err;
      const kind = classifyAiError(err);
      if (kind === "other" || attempt >= maxAttempts) {
        onStatus?.({ phase: "failed", error: err });
        throw err;
      }
      const secs = Math.round(delay / 1000);
      onStatus?.({ phase: "waiting", attempt, nextRetryInSec: secs, reason: kind });
      try {
        await wait(delay, signal);
      } catch {
        throw err;
      }
      delay = Math.min(Math.round(delay * 1.5), maxDelayMs);
    }
  }
  throw lastError;
}
