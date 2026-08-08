import { localDateKey } from "@/lib/localDate";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, ChevronRight, Zap, Check, Flame, Shield, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useUserId";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";

const GOAL_OPTIONS = [50, 100, 150, 200, 300];

const getMultiplier = (goalStreak: number): { value: number; label: string } => {
  if (goalStreak >= 7) return { value: 2.0, label: "2×" };
  if (goalStreak >= 5) return { value: 1.5, label: "1.5×" };
  if (goalStreak >= 3) return { value: 1.25, label: "1.25×" };
  if (goalStreak >= 2) return { value: 1.1, label: "1.1×" };
  return { value: 1.0, label: "" };
};

const DailyGoal = () => {
  const userId = useUserId();
  const [xpTarget, setXpTarget] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goalStreak, setGoalStreak] = useState(0);
  const [streakFreezes, setStreakFreezes] = useState(0);
  const prevCompleteRef = useRef(false);
  const prevMilestoneRef = useRef(0);
  const [milestonePopup, setMilestonePopup] = useState<{ pct: number; emoji: string } | null>(null);

  const today = localDateKey();

  const playSuccess = () => {
    try {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch {}
  };

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        const [goalRes, progressRes] = await Promise.all([
          supabase.from("daily_goals").select("*").eq("user_id", userId).eq("goal_date", today).maybeSingle(),
          supabase.from("user_progress").select("goal_streak, streak_freezes").eq("user_id", userId).maybeSingle(),
        ]);

        if (goalRes.data) {
          setXpTarget(goalRes.data.xp_target);
          setXpEarned(goalRes.data.xp_earned);
        }
        if (progressRes.data) {
          setGoalStreak((progressRes.data as any).goal_streak ?? 0);
          setStreakFreezes((progressRes.data as any).streak_freezes ?? 0);
        }
      } catch (err) {
        console.error("Error fetching daily goal:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, today]);

  // Realtime subscription for xp_earned updates
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("daily-goal-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "daily_goals", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.goal_date === today) {
            setXpEarned(row.xp_earned);
            if (row.xp_target) setXpTarget(row.xp_target);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, today]);

  // Milestone animations at 25%, 50%, 75%
  const MILESTONES = [
    { pct: 25, emoji: "🔥" },
    { pct: 50, emoji: "⚡" },
    { pct: 75, emoji: "🚀" },
  ];

  useEffect(() => {
    if (xpTarget === null || xpTarget === 0) return;
    const currentPct = (xpEarned / xpTarget) * 100;
    
    // Find highest milestone reached
    const reached = MILESTONES.filter(m => currentPct >= m.pct);
    const highestMilestone = reached.length > 0 ? reached[reached.length - 1].pct : 0;

    if (highestMilestone > prevMilestoneRef.current && highestMilestone < 100) {
      const milestone = MILESTONES.find(m => m.pct === highestMilestone)!;
      setMilestonePopup(milestone);
      // Small confetti burst for milestones
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.75 }, colors: ["#FFD700", "#4ECDC4"] });
      setTimeout(() => setMilestonePopup(null), 2000);
    }
    prevMilestoneRef.current = highestMilestone;
  }, [xpEarned, xpTarget]);

  // Confetti + sound + streak update when goal is reached (100%)
  useEffect(() => {
    const isComplete = xpTarget !== null && xpEarned >= xpTarget;
    if (isComplete && !prevCompleteRef.current) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"] });
      playSuccess();

      // Increment goal_streak and award freeze every 5 days
      if (userId) {
        (async () => {
          try {
            const newStreak = goalStreak + 1;
            const updates: any = { goal_streak: newStreak };
            // Award a streak freeze every 5 consecutive goal days
            if (newStreak > 0 && newStreak % 5 === 0) {
              updates.streak_freezes = streakFreezes + 1;
              setStreakFreezes(streakFreezes + 1);
            }
            await supabase
              .from("user_progress")
              .update(updates)
              .eq("user_id", userId);
            setGoalStreak(newStreak);
          } catch (err) {
            console.error("Error updating goal streak:", err);
          }
        })();
      }
    }
    prevCompleteRef.current = isComplete;
  }, [xpEarned, xpTarget]);

  const setGoal = async (target: number) => {
    if (!userId) return;
    setXpTarget(target);
    setShowPicker(false);

    try {
      await supabase.from("daily_goals").upsert(
        { user_id: userId, goal_date: today, xp_target: target, xp_earned: xpEarned },
        { onConflict: "user_id,goal_date" }
      );
    } catch (err) {
      console.error("Error setting goal:", err);
    }
  };

  if (loading) return null;

  const progress = xpTarget ? Math.min((xpEarned / xpTarget) * 100, 100) : 0;
  const isComplete = xpTarget !== null && xpEarned >= xpTarget;
  const multiplier = getMultiplier(goalStreak);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-2xl shadow-card p-4 relative overflow-hidden"
    >
      {milestonePopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-card/90 rounded-2xl"
        >
          <div className="text-center">
            <motion.span
              className="text-4xl block"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6 }}
            >
              {milestonePopup.emoji}
            </motion.span>
            <p className="font-bold text-foreground text-sm mt-1">
              {milestonePopup.pct}% done!
            </p>
            <p className="text-xs text-muted-foreground">Keep going!</p>
          </div>
        </motion.div>
      )}

      {xpTarget === null && !showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground text-sm">Set Today's XP Goal</p>
              <p className="text-xs text-muted-foreground">Choose how much you want to learn!</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      ) : showPicker ? (
        <div>
          <p className="font-bold text-foreground text-sm mb-3">How much XP today? ⚡</p>
          <div className="flex gap-2 flex-wrap">
            {GOAL_OPTIONS.map((opt) => (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.95 }}
                onClick={() => setGoal(opt)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  opt === xpTarget
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted-foreground/10"
                }`}
              >
                {opt} XP
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isComplete ? (
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--green))]/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-[hsl(var(--green))]" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
              )}
              <div>
                <p className="font-bold text-foreground text-sm">
                  {isComplete ? "Goal reached! 🎉" : "Today's Goal"}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    {xpEarned} / {xpTarget} XP
                  </p>
                  {multiplier.label && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold"
                    >
                      <Flame className="w-2.5 h-2.5" />
                      {multiplier.label} bonus
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs text-primary font-semibold"
            >
              Change
            </button>
          </div>
          {/* Milestone dots */}
          <div className="relative">
            <Progress value={progress} className="h-3" />
            <div className="absolute top-0 left-0 w-full h-3 pointer-events-none">
              {MILESTONES.map((m) => (
                <div
                  key={m.pct}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-background"
                  style={{ left: `${m.pct}%`, background: progress >= m.pct ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)' }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            {goalStreak > 0 && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-destructive" />
                {goalStreak} day goal streak{multiplier.label ? ` — earning ${multiplier.label} XP!` : ""}
              </p>
            )}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground"
            >
              {streakFreezes > 0 ? (
                <ShieldCheck className="w-3 h-3 text-[hsl(var(--turquoise))]" />
              ) : (
                <Shield className="w-3 h-3 text-muted-foreground" />
              )}
              <span className="text-[10px] font-semibold">
                {streakFreezes} freeze{streakFreezes !== 1 ? "s" : ""}
              </span>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DailyGoal;
