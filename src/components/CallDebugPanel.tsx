import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Bug, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { onCallDebug, type CallDebugEntry } from "@/lib/callDebugBus";

const MAX_ENTRIES = 60;

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
};

const labelFor = (e: CallDebugEntry): { tag: string; tone: string; text: string } => {
  switch (e.type) {
    case "stt-start":
      return { tag: "STT▶", tone: "text-sky-300", text: `lang=${e.lang} continuous=${e.continuous} alt=${e.maxAlternatives}` };
    case "stt-result":
      return { tag: e.isFinal ? "STT✓" : "STT…", tone: "text-sky-200", text: `(${e.detectedLang}) ${e.text}` };
    case "stt-end":
      return { tag: "STT■", tone: "text-sky-400", text: e.finalText || "(no text)" };
    case "stt-error":
      return { tag: "STT✗", tone: "text-rose-300", text: `${e.error}${e.message ? ` — ${e.message}` : ""}` };
    case "tts-start":
      return { tag: "TTS▶", tone: "text-emerald-300", text: `voice=${e.voiceName ?? "(default)"} lang=${e.voiceLang ?? "?"} rate=${e.rate.toFixed(2)} — ${e.chunkPreview}` };
    case "tts-end":
      return { tag: "TTS■", tone: "text-emerald-400", text: "playback complete" };
    case "tts-error":
      return { tag: "TTS✗", tone: "text-rose-300", text: e.message || "playback failed" };
    case "tts-fallback":
      return { tag: "TTS↺", tone: "text-amber-300", text: `fallback voice engaged for ${e.lang}` };
    case "info":
      return { tag: "i", tone: "text-white/70", text: e.message };
  }
};

const CallDebugPanel = () => {
  const [entries, setEntries] = useState<CallDebugEntry[]>([]);
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return onCallDebug((entry) => {
      setEntries((prev) => {
        const next = [...prev, entry];
        if (next.length > MAX_ENTRIES) next.splice(0, next.length - MAX_ENTRIES);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, open]);

  // Compute latest summary
  const latestStt = [...entries].reverse().find((e) => e.type === "stt-start") as Extract<CallDebugEntry, { type: "stt-start" }> | undefined;
  const latestDetected = [...entries].reverse().find((e) => e.type === "stt-result") as Extract<CallDebugEntry, { type: "stt-result" }> | undefined;
  const latestTts = [...entries].reverse().find((e) => e.type === "tts-start") as Extract<CallDebugEntry, { type: "tts-start" }> | undefined;
  const latestErr = [...entries].reverse().find((e) => e.type === "stt-error" || e.type === "tts-error");

  return (
    <div className="rounded-2xl border border-white/30 bg-black/40 backdrop-blur p-2.5 text-white text-[11px] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 font-bold"
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Hindi Call Debug</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setEntries([])}
        >
          <Trash2 className="w-3 h-3 mr-1" /> Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded bg-white/10 px-2 py-1">
          <div className="text-white/60">STT lang</div>
          <div className="font-mono">{latestStt?.lang ?? "—"}</div>
        </div>
        <div className="rounded bg-white/10 px-2 py-1">
          <div className="text-white/60">Detected input</div>
          <div className="font-mono">{latestDetected?.detectedLang ?? "—"}</div>
        </div>
        <div className="rounded bg-white/10 px-2 py-1">
          <div className="text-white/60">TTS voice</div>
          <div className="font-mono truncate" title={latestTts?.voiceName ?? ""}>{latestTts?.voiceName ?? "(default)"}</div>
        </div>
        <div className="rounded bg-white/10 px-2 py-1">
          <div className="text-white/60">TTS lang</div>
          <div className="font-mono">{latestTts?.voiceLang ?? "—"}</div>
        </div>
      </div>

      {latestErr && (
        <div className="rounded bg-rose-500/20 border border-rose-300/40 px-2 py-1 text-rose-100">
          Last error: {latestErr.type === "stt-error" ? `STT ${latestErr.error}` : `TTS ${latestErr.message ?? ""}`}
        </div>
      )}

      {open && (
        <div ref={scrollRef} className="max-h-40 overflow-y-auto rounded bg-black/40 px-2 py-1.5 space-y-0.5 font-mono">
          {entries.length === 0 ? (
            <div className="text-white/50">No events yet — start the mic or run a voice test.</div>
          ) : (
            entries.map((e, idx) => {
              const l = labelFor(e);
              return (
                <div key={idx} className="flex gap-2">
                  <span className="text-white/40">{fmtTime(e.ts)}</span>
                  <span className={`shrink-0 w-10 ${l.tone}`}>{l.tag}</span>
                  <span className="text-white/90 break-words">{l.text}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CallDebugPanel;
