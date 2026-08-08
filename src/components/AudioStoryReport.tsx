import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Headphones, Clock, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AudioStoryReportProps {
  userId: string | null;
  variant?: "card" | "plain";
}

interface ListenRow {
  story_id: string;
  story_title: string;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
}

interface StoryAggregate {
  story_id: string;
  story_title: string;
  plays: number;
  totalSeconds: number;
  lastPlayed: string;
  completedCount: number;
}

const AudioStoryReport = ({ userId, variant = "card" }: AudioStoryReportProps) => {
  const [rows, setRows] = useState<ListenRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("audio_story_listens")
        .select("story_id, story_title, duration_seconds, completed, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const totalSeconds = rows.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const totalPlays = rows.length;
  const uniqueStories = new Set(rows.map((r) => r.story_id)).size;

  const aggregates: StoryAggregate[] = Object.values(
    rows.reduce<Record<string, StoryAggregate>>((acc, r) => {
      if (!acc[r.story_id]) {
        acc[r.story_id] = {
          story_id: r.story_id,
          story_title: r.story_title,
          plays: 0,
          totalSeconds: 0,
          lastPlayed: r.created_at,
          completedCount: 0,
        };
      }
      acc[r.story_id].plays += 1;
      acc[r.story_id].totalSeconds += r.duration_seconds || 0;
      if (r.completed) acc[r.story_id].completedCount += 1;
      if (new Date(r.created_at) > new Date(acc[r.story_id].lastPlayed)) {
        acc[r.story_id].lastPlayed = r.created_at;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.totalSeconds - a.totalSeconds);

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    variant === "card" ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-card p-5"
      >
        {children}
      </motion.div>
    ) : (
      <div>{children}</div>
    );

  return (
    <Wrapper>
      <div className="flex items-center gap-2 mb-4">
        <Headphones className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Audio Stories Report</h2>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-4">Loading...</p>
      ) : totalPlays === 0 ? (
        <div className="text-center py-6">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground text-sm">
            No audio stories listened to yet.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="bg-muted rounded-xl p-3">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{totalMinutes}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Total Min
              </p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Headphones className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{totalPlays}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Plays
              </p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{uniqueStories}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Stories
              </p>
            </div>
          </div>

          {/* Per-story list */}
          <div className="space-y-2">
            {aggregates.map((agg, i) => {
              const maxSeconds = aggregates[0]?.totalSeconds || 1;
              const barWidth = Math.max(8, (agg.totalSeconds / maxSeconds) * 100);
              return (
                <motion.div
                  key={agg.story_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border border-border rounded-xl p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {agg.story_title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {agg.plays} {agg.plays === 1 ? "play" : "plays"} ·{" "}
                        {agg.completedCount} completed · last {formatDate(agg.lastPlayed)}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-primary whitespace-nowrap">
                      {formatDuration(agg.totalSeconds)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.04 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </Wrapper>
  );
};

export default AudioStoryReport;
