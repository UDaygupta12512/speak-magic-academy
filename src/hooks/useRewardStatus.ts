import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "./useUserId";
import { localDateKey, daysBetweenLocal, tomorrowLocal, formatFriendlyDate } from "@/lib/localDate";

export const REWARD_SCHEDULE = [
  { day: 1, xp: 25, emoji: "🎁", label: "25 XP" },
  { day: 2, xp: 35, emoji: "⭐", label: "35 XP" },
  { day: 3, xp: 50, emoji: "🔥", label: "50 XP" },
  { day: 4, xp: 0, emoji: "🛡️", label: "Freeze" },
  { day: 5, xp: 75, emoji: "💎", label: "75 XP" },
  { day: 6, xp: 100, emoji: "⚡", label: "100 XP" },
  { day: 7, xp: 150, emoji: "🎉", label: "150 XP + ✨" },
];

export interface RewardStatus {
  loading: boolean;
  currentDay: number;
  claimedToday: boolean;
  nextDay: number;
  nextReward: typeof REWARD_SCHEDULE[number];
  nextResetLabel: string; // e.g. "Tomorrow, Sun Jul 19"
  hoursUntilReset: number;
  cycleStreakBroken: boolean;
}

export function useRewardStatus(): RewardStatus {
  const userId = useUserId();
  const [status, setStatus] = useState<RewardStatus>({
    loading: true,
    currentDay: 1,
    claimedToday: false,
    nextDay: 1,
    nextReward: REWARD_SCHEDULE[0],
    nextResetLabel: "",
    hoursUntilReset: 0,
    cycleStreakBroken: false,
  });

  useEffect(() => {
    if (!userId) return;
    const today = localDateKey();

    (async () => {
      const { data } = await supabase
        .from("daily_login_rewards")
        .select("claim_date, day_number")
        .eq("user_id", userId)
        .order("claim_date", { ascending: false })
        .limit(1);

      let currentDay = 1;
      let claimedToday = false;
      let cycleStreakBroken = false;
      if (data && data.length > 0) {
        const last = data[0] as any;
        const diff = daysBetweenLocal(last.claim_date);
        claimedToday = last.claim_date === today;
        if (diff <= 1) {
          currentDay = claimedToday ? last.day_number : (last.day_number % 7) + 1;
        } else {
          currentDay = 1;
          cycleStreakBroken = true;
        }
      }

      const nextDay = claimedToday ? (currentDay % 7) + 1 : currentDay;
      const tmr = tomorrowLocal();
      setStatus({
        loading: false,
        currentDay,
        claimedToday,
        nextDay,
        nextReward: REWARD_SCHEDULE[nextDay - 1],
        nextResetLabel: claimedToday ? `Tomorrow • ${formatFriendlyDate(tmr)}` : "Available now",
        hoursUntilReset: Math.max(0, Math.round((tmr.getTime() - Date.now()) / 3_600_000)),
        cycleStreakBroken,
      });
    })();
  }, [userId]);

  return status;
}
