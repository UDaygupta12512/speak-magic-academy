import { memo, useEffect, useMemo, useState } from "react";
import { BarChart3, Brain, Flame, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserId } from "@/hooks/useUserId";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/integrations/supabase/client";

type SessionRow = { activity_type: string; xp_earned: number; created_at: string };
type FlashcardRow = { word: string; correct_count: number; review_count: number };

const ACTIVITY_LABELS: Record<string, string> = {
  chat: "Practice Chat",
  chat_hi: "Hindi Chat",
  roleplay: "Roleplay",
  call: "AI Call",
  flashcards: "Flashcards",
  spelling_bee: "Spelling Bee",
  word_match: "Word Match",
  word_meaning: "Word Meaning",
  spelling: "Spelling",
  vocab_quiz: "Vocab Quiz",
  speed_round: "Speed Round",
  scramble: "Scramble",
  phonics: "Phonics",
  grammar: "Grammar",
  reading: "Reading",
  listening: "Listening",
  pronunciation: "Pronunciation",
  writing: "Writing",
  story: "Stories",
  comic: "Comic Book",
};

const PIE_COLORS = ["hsl(var(--primary))", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

const labelFor = (type: string) =>
  ACTIVITY_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Mind-map branches are pure geometry derived from two string arrays.
 * Memoised so the (expensive, animated) SVG doesn't re-render when unrelated
 * Analytics state — charts, progress, loading flags — changes.
 */
const MindMapSvg = memo(
  ({ topActivities, masteredWords }: { topActivities: string[]; masteredWords: string[] }) => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.35)" />
          <stop offset="60%" stopColor="hsl(var(--purple) / 0.15)" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
        </radialGradient>
        <linearGradient id="branchGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--purple))" stopOpacity="0.55" />
        </linearGradient>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="0.6 1.2" />
      <circle cx="50" cy="50" r="34" fill="url(#brainGlow)" />

      {topActivities.map((_, i) => {
        const total = Math.max(topActivities.length, 1);
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        const r = 34;
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        const cx = 50 + r * 0.55 * Math.cos(angle + 0.35);
        const cy = 50 + r * 0.55 * Math.sin(angle + 0.35);
        return (
          <motion.path
            key={`act-${i}`}
            d={`M 50 50 Q ${cx} ${cy} ${x} ${y}`}
            stroke="url(#branchGrad)"
            strokeWidth="0.7"
            strokeLinecap="round"
            fill="none"
            filter="url(#softGlow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: i * 0.06 }}
          />
        );
      })}

      {masteredWords.map((_, i) => {
        const total = Math.max(masteredWords.length, 1);
        const angle = (i / total) * Math.PI * 2 + Math.PI / 6;
        const rIn = 34, rOut = 44;
        const x1 = 50 + rIn * Math.cos(angle);
        const y1 = 50 + rIn * Math.sin(angle);
        const x2 = 50 + rOut * Math.cos(angle);
        const y2 = 50 + rOut * Math.sin(angle);
        return (
          <motion.line
            key={`leaf-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="hsl(var(--yellow))"
            strokeOpacity="0.55"
            strokeWidth="0.4"
            strokeDasharray="1 1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.04 }}
          />
        );
      })}

      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 48;
        return (
          <motion.circle
            key={`tw-${i}`}
            cx={50 + r * Math.cos(a)}
            cy={50 + r * Math.sin(a)}
            r="0.6"
            fill="hsl(var(--primary))"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.25 }}
          />
        );
      })}
    </svg>
  ),
  (a, b) =>
    a.topActivities.join("|") === b.topActivities.join("|") &&
    a.masteredWords.join("|") === b.masteredWords.join("|"),
);
MindMapSvg.displayName = "MindMapSvg";


const Analytics = () => {
  const userId = useUserId();
  const { progress } = useProgress();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 13);
      const [sRes, fRes] = await Promise.all([
        supabase
          .from("activity_sessions")
          .select("activity_type, xp_earned, created_at")
          .eq("user_id", userId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("flashcards")
          .select("word, correct_count, review_count")
          .eq("user_id", userId)
          .limit(60),
      ]);
      if (cancelled) return;
      setSessions((sRes.data as SessionRow[]) || []);
      setFlashcards((fRes.data as FlashcardRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Last 14 days XP series
  const xpByDay = useMemo(() => {
    const days: { day: string; xp: number; date: string }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, day: d.toLocaleDateString(undefined, { weekday: "short" }), xp: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    sessions.forEach((s) => {
      const k = s.created_at.slice(0, 10);
      const i = idx.get(k);
      if (i !== undefined) days[i].xp += s.xp_earned || 0;
    });
    return days;
  }, [sessions]);

  // Activity breakdown (for pie)
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => map.set(s.activity_type, (map.get(s.activity_type) || 0) + (s.xp_earned || 0)));
    const arr = Array.from(map, ([type, value]) => ({ name: labelFor(type), type, value }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 8);
  }, [sessions]);

  // MindMap nodes — center = "My English Brain"; spokes = top activities;
  // sub-nodes = mastered flashcard words.
  const mindMap = useMemo(() => {
    const masteredWords = flashcards
      .filter((f) => f.correct_count >= 2)
      .slice(0, 12)
      .map((f) => f.word);
    const topActivities = breakdown.slice(0, 6).map((b) => b.name);
    return { masteredWords, topActivities };
  }, [flashcards, breakdown]);

  const totalXp14d = xpByDay.reduce((s, d) => s + d.xp, 0);
  const activeDays = xpByDay.filter((d) => d.xp > 0).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Analytics & Mind Map" showBack icon={<BarChart3 className="w-5 h-5 text-primary" />} />

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Summary cards */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2"
        >
          <div className="bg-card rounded-2xl p-3 shadow-card text-center">
            <Trophy className="w-5 h-5 mx-auto text-yellow mb-1" />
            <p className="text-lg font-bold text-foreground leading-none">{progress?.xp ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total XP</p>
          </div>
          <div className="bg-card rounded-2xl p-3 shadow-card text-center">
            <Flame className="w-5 h-5 mx-auto text-orange mb-1" />
            <p className="text-lg font-bold text-foreground leading-none">{progress?.streak_days ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Day Streak</p>
          </div>
          <div className="bg-card rounded-2xl p-3 shadow-card text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground leading-none">{activeDays}/14</p>
            <p className="text-[10px] text-muted-foreground mt-1">Active Days</p>
          </div>
        </motion.section>

        {/* XP over time */}
        <section className="bg-card rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-foreground">XP — Last 14 Days</h2>
            <span className="ml-auto text-xs text-muted-foreground">{totalXp14d} XP</span>
          </div>
          {loading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={xpByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                />
                <Bar dataKey="xp" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Activity Breakdown */}
        <section className="bg-card rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple" />
            <h2 className="font-bold text-foreground">What you practiced most</h2>
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Play some activities to see your breakdown here!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={36} outerRadius={70} paddingAngle={2}>
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-1.5 text-xs">
                {breakdown.map((b, i) => (
                  <li key={b.type} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate text-foreground">{b.name}</span>
                    <span className="ml-auto font-semibold text-muted-foreground">{b.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Mind Map */}
        <section className="bg-card rounded-2xl p-4 shadow-card overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-pink" />
            <h2 className="font-bold text-foreground">Your Learning Mind Map</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            A living picture of your English brain — branches are the activities you practice and leaves are words you've mastered.
          </p>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* SVG branches + glow */}
              <MindMapSvg topActivities={mindMap.topActivities} masteredWords={mindMap.masteredWords} />


              {/* Center node — pulsing brain */}
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <motion.div
                  animate={{ boxShadow: ["0 0 0 0 hsl(var(--primary)/0.4)", "0 0 0 14px hsl(var(--primary)/0)"] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-purple to-pink flex items-center justify-center text-primary-foreground text-center text-xs font-bold p-2 ring-4 ring-primary/20"
                >
                  <span className="drop-shadow">My English<br />Brain</span>
                </motion.div>
              </motion.div>

              {/* Activity spokes — colored per index */}
              {mindMap.topActivities.map((name, i) => {
                const total = Math.max(mindMap.topActivities.length, 1);
                const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
                const r = 34;
                const left = 50 + r * Math.cos(angle);
                const top = 50 + r * Math.sin(angle);
                const color = PIE_COLORS[i % PIE_COLORS.length];
                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05, type: "spring" }}
                    whileHover={{ scale: 1.15, zIndex: 30 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <div
                      className="px-2.5 py-1.5 rounded-full text-white text-[10px] font-bold whitespace-nowrap shadow-lg border-2 border-white dark:border-card cursor-default"
                      style={{ background: color }}
                    >
                      {name}
                    </div>
                  </motion.div>
                );
              })}

              {/* Mastered words on outer ring — floating */}
              {mindMap.masteredWords.map((word, i) => {
                const total = Math.max(mindMap.masteredWords.length, 1);
                const angle = (i / total) * Math.PI * 2 + Math.PI / 6;
                const r = 46;
                const left = 50 + r * Math.cos(angle);
                const top = 50 + r * Math.sin(angle);
                return (
                  <motion.div
                    key={`${word}-${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: [0, -2, 0] }}
                    transition={{ opacity: { delay: 0.5 + i * 0.04 }, y: { duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut" } }}
                    whileHover={{ scale: 1.2, zIndex: 20 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    <div className="px-2 py-1 rounded-md bg-gradient-to-br from-yellow to-orange text-yellow-900 text-[10px] font-bold whitespace-nowrap shadow-md border border-yellow-700/30 cursor-default">
                      ✦ {word}
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty state inside the map */}
              {mindMap.topActivities.length === 0 && mindMap.masteredWords.length === 0 && (
                <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground">
                  Practice activities and review flashcards to grow your mind map!
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground justify-center flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple" /> {mindMap.topActivities.length} Activities</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow" /> {mindMap.masteredWords.length} Mastered words</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Brain core</span>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Analytics;
