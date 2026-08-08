// Generic network resilience helper: exponential backoff with jitter for
// transient failures (offline, timeouts, 429, 5xx) and safe, idempotent retries.

export type RetryReason = "offline" | "timeout" | "rate-limit" | "server" | "unknown";

export interface NetworkRetryOptions {
  /** Total attempts including the first one. Default 3. */
  attempts?: number;
  /** Delay before the first retry, in ms. Default 600. */
  baseDelayMs?: number;
  /** Upper bound for a single delay, in ms. Default 8000. */
  maxDelayMs?: number;
  /** Cancel pending retries. */
  signal?: AbortSignal;
  onRetry?: (info: { attempt: number; delayMs: number; reason: RetryReason; error: unknown }) => void;
}

const statusOf = (err: unknown): number | undefined => {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { status?: number; context?: { status?: number }; code?: unknown };
  return e.status ?? e.context?.status;
};

/** Classify an error; returns null when the error should NOT be retried. */
export function classifyNetworkError(err: unknown): RetryReason | null {
  if (err instanceof DOMException && err.name === "AbortError") return null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";

  const status = statusOf(err);
  if (status !== undefined) {
    if (status === 408 || status === 425) return "timeout";
    if (status === 429) return "rate-limit";
    if (status >= 500) return "server";
    return null; // 4xx is a client error — retrying will fail identically
  }

  const msg = (err as Error)?.message?.toLowerCase() ?? "";
  if (!msg) return null;
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed")) {
    return "offline";
  }
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("too many requests")) return "rate-limit";
  return null;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Run `fn` and retry transient network failures with exponential backoff + jitter.
 * `fn` receives the attempt number (1-based) so callers can log or vary behaviour.
 * Non-transient errors are rethrown immediately.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: NetworkRetryOptions = {},
): Promise<T> {
  const { attempts = 3, baseDelayMs = 600, maxDelayMs = 8000, signal, onRetry } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const reason = classifyNetworkError(err);
      if (reason === null || attempt === attempts) throw err;

      const exponential = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      // Full jitter avoids synchronized retry storms across components.
      const delayMs = Math.round(exponential / 2 + Math.random() * (exponential / 2));
      onRetry?.({ attempt, delayMs, reason, error: err });
      await sleep(delayMs, signal);
    }
  }
  throw lastError;
}

/**
 * Wrap an async action so overlapping invocations share the SAME in-flight
 * promise instead of firing duplicate requests. Makes Retry buttons safe to
 * double-click and prevents race conditions between competing responses.
 */
export function singleFlight<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return (...args: A) => {
    if (inFlight) return inFlight;
    inFlight = fn(...args).finally(() => {
      inFlight = null;
    }) as Promise<T>;
    return inFlight;
  };
}
