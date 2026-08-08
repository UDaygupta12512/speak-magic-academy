import { localDateKey } from "@/lib/localDate";
import { supabase } from "@/integrations/supabase/client";

const PENDING_XP_KEY = "speakgenie_pending_xp";
const CACHED_PROGRESS_KEY = "speakgenie_cached_progress";
const PENDING_SCORES_KEY = "speakgenie_pending_scores";

// ── Progress cache ──────────────────────────────────────────────

export interface CachedProgress {
  xp: number;
  coins?: number;
  level: number;
  streak_days: number;
  lessons_completed: number;
  total_lessons: number;
  last_activity_date: string | null;
  goal_streak: number;
  streak_freezes?: number;
  streak_freeze_used_date?: string | null;
}

export function getCachedProgress(): CachedProgress | null {
  try {
    const raw = localStorage.getItem(CACHED_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedProgress(progress: CachedProgress) {
  try {
    localStorage.setItem(CACHED_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or unavailable
  }
}

// ── Pending XP queue ────────────────────────────────────────────

interface PendingXP {
  userId: string;
  amount: number;
  timestamp: string;
}

export function queuePendingXP(userId: string, amount: number) {
  try {
    const existing = getPendingXP();
    existing.push({ userId, amount, timestamp: new Date().toISOString() });
    localStorage.setItem(PENDING_XP_KEY, JSON.stringify(existing));
  } catch {
    // Storage full
  }
}

function getPendingXP(): PendingXP[] {
  try {
    const raw = localStorage.getItem(PENDING_XP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearPendingXP() {
  localStorage.removeItem(PENDING_XP_KEY);
}

// ── Pending game scores queue ───────────────────────────────────

interface PendingScore {
  userId: string;
  gameType: string;
  score: number;
  maxScore: number;
  timestamp: string;
}

export function queuePendingScore(userId: string, gameType: string, score: number, maxScore: number) {
  try {
    const existing = getPendingScores();
    existing.push({ userId, gameType, score, maxScore, timestamp: new Date().toISOString() });
    localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(existing));
  } catch {
    // Storage full
  }
}

function getPendingScores(): PendingScore[] {
  try {
    const raw = localStorage.getItem(PENDING_SCORES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearPendingScores() {
  localStorage.removeItem(PENDING_SCORES_KEY);
}

// ── Sync engine ─────────────────────────────────────────────────

export async function syncPendingData(): Promise<{ xpSynced: number; scoresSynced: number }> {
  let xpSynced = 0;
  let scoresSynced = 0;

  // 1. Sync accumulated XP
  const pendingXP = getPendingXP();
  if (pendingXP.length > 0) {
    // Group by userId and sum
    const xpByUser = new Map<string, number>();
    for (const entry of pendingXP) {
      xpByUser.set(entry.userId, (xpByUser.get(entry.userId) || 0) + entry.amount);
    }

    for (const [userId, totalXP] of xpByUser) {
      try {
        // Fetch current server-side XP
        const { data, error } = await supabase
          .from("user_progress")
          .select("xp, level, streak_days, last_activity_date")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const newXP = data.xp + totalXP;
          const newLevel = Math.floor(newXP / 500) + 1;
          const today = localDateKey();
          const isNewDay = data.last_activity_date !== today;

          const { error: updateError } = await supabase
            .from("user_progress")
            .update({
              xp: newXP,
              level: newLevel,
              streak_days: isNewDay ? data.streak_days + 1 : data.streak_days,
              last_activity_date: today,
            })
            .eq("user_id", userId);

          if (updateError) throw updateError;
          xpSynced += totalXP;
        }
      } catch (err) {
        console.error("Failed to sync XP for user:", userId, err);
        return { xpSynced, scoresSynced }; // Stop – still offline
      }
    }
    clearPendingXP();
  }

  // 2. Sync pending game scores
  const pendingScores = getPendingScores();
  if (pendingScores.length > 0) {
    for (const entry of pendingScores) {
      try {
        const { error } = await supabase.from("game_scores").insert({
          user_id: entry.userId,
          game_type: entry.gameType,
          score: entry.score,
          max_score: entry.maxScore,
        });
        if (error) throw error;
        scoresSynced++;
      } catch (err) {
        console.error("Failed to sync score:", err);
        // Keep remaining scores for next sync attempt
        const remaining = pendingScores.slice(pendingScores.indexOf(entry));
        localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(remaining));
        return { xpSynced, scoresSynced };
      }
    }
    clearPendingScores();
  }

  return { xpSynced, scoresSynced };
}

export function hasPendingData(): boolean {
  return getPendingXP().length > 0 || getPendingScores().length > 0;
}
