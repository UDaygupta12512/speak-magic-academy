import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Check, Shield, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useUserId";
import { useProgress } from "@/hooks/useProgress";
import { localDateKey, daysBetweenLocal } from "@/lib/localDate";
import confetti from "canvas-confetti";

// 7-day reward cycle — day 7 is the big reward
const REWARD_SCHEDULE = [
  { day: 1, xp: 25, emoji: "🎁", label: "25 XP", type: "xp" },
  { day: 2, xp: 35, emoji: "⭐", label: "35 XP", type: "xp" },
  { day: 3, xp: 50, emoji: "🔥", label: "50 XP", type: "xp" },
  { day: 4, xp: 0, emoji: "🛡️", label: "Freeze", type: "streak_freeze" },
  { day: 5, xp: 75, emoji: "💎", label: "75 XP", type: "xp" },
  { day: 6, xp: 100, emoji: "⚡", label: "100 XP", type: "xp" },
  { day: 7, xp: 150, emoji: "🎉", label: "150 XP + ✨", type: "xp_and_double" },
];

const DailyLoginReward = () => {
  const userId = useUserId();
  const { addXP, refetch } = useProgress();
  const [claimedToday, setClaimedToday] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [claimedReward, setClaimedReward] = useState<typeof REWARD_SCHEDULE[0] | null>(null);
  const [recentClaims, setRecentClaims] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const today = localDateKey();

  useEffect(() => {
    if (!userId) return;

    const fetchLoginData = async () => {
      try {
        // Get recent claims (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: claims } = await supabase
          .from("daily_login_rewards")
          .select("claim_date, day_number")
          .eq("user_id", userId)
          .gte("claim_date", localDateKey(sevenDaysAgo))
          .order("claim_date", { ascending: false });

        const claimDates = (claims ?? []).map((c: any) => c.claim_date);
        setRecentClaims(claimDates);

        const todayClaimed = claimDates.includes(today);
        setClaimedToday(todayClaimed);

        // Calculate current day in cycle (timezone-aware)
        if (claims && claims.length > 0) {
          const lastClaim = claims[0] as any;
          const diffDays = daysBetweenLocal(lastClaim.claim_date);

          if (diffDays <= 1) {
            // Consecutive — continue cycle
            setCurrentDay(todayClaimed ? lastClaim.day_number : ((lastClaim.day_number % 7) + 1));
          } else {
            // Streak broken — reset to day 1
            setCurrentDay(1);
          }
        } else {
          setCurrentDay(1);
        }

        // Auto-show modal if not claimed today
        if (!todayClaimed) {
          setTimeout(() => setShowModal(true), 800);
        }
      } catch (err) {
        console.error("Error fetching login rewards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoginData();
  }, [userId, today]);

  const claimReward = async () => {
    if (!userId || claimedToday) return;

    const reward = REWARD_SCHEDULE[currentDay - 1];
    setClaimedReward(reward);
    setClaimedToday(true);

    // Insert claim record
    try {
      await supabase.from("daily_login_rewards").insert({
        user_id: userId,
        claim_date: today,
        day_number: currentDay,
        reward_type: reward.type,
        reward_value: reward.xp,
      } as any);
    } catch (err) {
      console.error("Error inserting login reward:", err);
    }

    // Grant XP
    if (reward.xp > 0) {
      await addXP(reward.xp);
    }

    // Grant streak freeze for day 4
    if (reward.type === "streak_freeze") {
      try {
        const { data } = await supabase
          .from("user_progress")
          .select("streak_freezes")
          .eq("user_id", userId)
          .maybeSingle();
        const current = (data as any)?.streak_freezes ?? 0;
        await supabase
          .from("user_progress")
          .update({ streak_freezes: current + 1 } as any)
          .eq("user_id", userId);
      } catch {}
    }

    // Day 7 bonus: activate double XP for 12h
    if (reward.type === "xp_and_double") {
      const expiry = Date.now() + 12 * 60 * 60 * 1000;
      localStorage.setItem("speakgenie_double_xp_until", expiry.toString());
    }

    // Celebration
    confetti({
      particleCount: reward.day === 7 ? 120 : 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#FFD700", "#4ECDC4", "#FF6B6B", "#C084FC"],
    });

    // Play coin sound
    try {
      const ctx = new AudioContext();
      [880, 1108.73].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.2);
      });
    } catch {}

    await refetch();

    // Close modal after delay
    setTimeout(() => setShowModal(false), 2500);
  };

  if (loading) return null;

  return (
    <>
      {/* Compact banner when not claimed */}
      {!claimedToday && !showModal && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowModal(true)}
          className="w-full bg-gradient-to-r from-[hsl(var(--yellow))]/20 to-[hsl(var(--orange))]/20 border border-[hsl(var(--yellow))]/30 rounded-2xl p-3 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--yellow))]/20 flex items-center justify-center text-xl">
            🎁
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-foreground text-sm">Daily Reward Ready!</p>
            <p className="text-xs text-muted-foreground">Tap to claim Day {currentDay} reward</p>
          </div>
          <Gift className="w-5 h-5 text-[hsl(var(--yellow))]" />
        </motion.button>
      )}

      {/* Claimed badge */}
      {claimedToday && !showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full bg-accent/50 rounded-2xl p-3 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--green))]/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-[hsl(var(--green))]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Day {currentDay} claimed!</p>
            <p className="text-[10px] text-muted-foreground">Come back tomorrow for Day {currentDay >= 7 ? 1 : currentDay + 1}</p>
          </div>
          {/* Mini day dots */}
          <div className="flex gap-1">
            {REWARD_SCHEDULE.map((r, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < currentDay ? "bg-[hsl(var(--green))]" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Full modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm px-4"
            onClick={() => claimedToday && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-card rounded-3xl p-6 shadow-xl max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-5">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.6 }}
                  className="text-4xl mb-2"
                >
                  🎁
                </motion.div>
                <h2 className="text-xl font-black text-foreground">Daily Reward</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {claimedToday ? "See you tomorrow!" : "Log in every day for bigger rewards!"}
                </p>
              </div>

              {/* 7-day calendar */}
              <div className="grid grid-cols-7 gap-1.5 mb-5">
                {REWARD_SCHEDULE.map((reward, i) => {
                  const dayNum = i + 1;
                  const isCurrent = dayNum === currentDay;
                  const isPast = dayNum < currentDay;
                  const isClaimed = isPast || (isCurrent && claimedToday);

                  return (
                    <motion.div
                      key={dayNum}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative flex flex-col items-center p-1.5 rounded-xl text-center transition-all ${
                        isCurrent && !claimedToday
                          ? "bg-primary/15 ring-2 ring-primary"
                          : isClaimed
                          ? "bg-[hsl(var(--green))]/10"
                          : "bg-muted/50"
                      }`}
                    >
                      <span className="text-lg">{reward.emoji}</span>
                      <span className={`text-[9px] font-bold mt-0.5 ${isClaimed ? "text-[hsl(var(--green))]" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        {reward.label}
                      </span>
                      <span className="text-[8px] text-muted-foreground">Day {dayNum}</span>
                      {isClaimed && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[hsl(var(--green))] flex items-center justify-center">
                          <Check className="w-2 h-2 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Claim / done button */}
              {claimedToday ? (
                <div className="text-center">
                  {claimedReward && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mb-3"
                    >
                      <p className="text-2xl">{claimedReward.emoji}</p>
                      <p className="font-bold text-foreground text-sm mt-1">
                        {claimedReward.type === "streak_freeze"
                          ? "+1 Streak Freeze!"
                          : claimedReward.type === "xp_and_double"
                          ? `+${claimedReward.xp} XP + 12h Double XP!`
                          : `+${claimedReward.xp} XP!`}
                      </p>
                    </motion.div>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 rounded-xl bg-muted text-foreground font-semibold text-sm"
                  >
                    Awesome!
                  </button>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={claimReward}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Gift className="w-5 h-5" />
                  Claim Day {currentDay} Reward
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DailyLoginReward;
