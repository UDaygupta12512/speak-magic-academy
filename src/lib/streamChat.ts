import { withRetry } from "@/lib/network";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const WINDOWS_1252_REVERSE: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

const repairUtf8Mojibake = (text: string): string => {
  if (!/(?:à[¤¥]|Ã|Â|â)/.test(text)) return text;
  try {
    const bytes = Uint8Array.from(Array.from(text), (ch) => {
      const mapped = WINDOWS_1252_REVERSE[ch];
      if (mapped !== undefined) return mapped;
      const code = ch.charCodeAt(0);
      return code <= 0xff ? code : 0x3f;
    });
    const repaired = new TextDecoder("utf-8").decode(bytes);
    return /[\u0900-\u097F]/.test(repaired) && !repaired.includes("�") ? repaired : text;
  } catch {
    return text;
  }
};

const getDeltaContent = (parsed: unknown): string => {
  if (!parsed || typeof parsed !== "object") return "";
  const choice = (parsed as { choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }> }).choices?.[0];
  const content = choice?.delta?.content ?? choice?.message?.content;
  return typeof content === "string" ? repairUtf8Mojibake(content) : "";
};

export async function streamChat({
  messages,
  activityType = "chat",
  systemPrompt,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  activityType?: string;
  systemPrompt?: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}) {
  try {
    // Retry only the connection attempt (before any token is emitted), so a
    // transient network blip / 429 / 5xx never surfaces as a dead chat bubble.
    const resp = await withRetry(async () => {
      const r = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages, activityType, systemPrompt }),
      });
      if (!r.ok) {
        const errorData = await r.clone().json().catch(() => ({}));
        const err = new Error(errorData.error || `Request failed with status ${r.status}`) as Error & { status?: number };
        err.status = r.status;
        throw err;
      }
      return r;
    }, { attempts: 3, baseDelayMs: 800 });


    if (!resp.body) {
      throw new Error("No response body");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.slice(5).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = getDeltaContent(parsed);
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data:")) continue;
        const jsonStr = raw.slice(5).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = getDeltaContent(parsed);
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream chat error:", error);
    onError?.(error instanceof Error ? error : new Error("Unknown error"));
  }
}
