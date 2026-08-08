import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserId } from './useUserId';
import {
  getCachedProgress,
  setCachedProgress,
  queuePendingXP,
  syncPendingData,
  hasPendingData,
  type CachedProgress,
} from '@/lib/offlineSync';
import { localDateKey, daysBetweenLocal } from '@/lib/localDate';
import { withRetry } from '@/lib/network';

interface UserProgress {
  xp: number;
  coins: number;
  streak_days: number;
  lessons_completed: number;
  total_lessons: number;
  level: number;
  last_activity_date: string | null;
  goal_streak: number;
  streak_freezes: number;
  streak_freeze_used_date: string | null;
}

const getMultiplier = (goalStreak: number): number => {
  if (goalStreak >= 7) return 2.0;
  if (goalStreak >= 5) return 1.5;
  if (goalStreak >= 3) return 1.25;
  if (goalStreak >= 2) return 1.1;
  return 1.0;
};

export const useProgress = () => {
  const userId = useUserId();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [leveledUp, setLeveledUp] = useState<number | null>(null);

  // ── Sync pending data when coming back online ─────────────
  useEffect(() => {
    const handleOnline = async () => {
      if (!hasPendingData() || !userId) return;
      console.log('[OfflineSync] Back online – syncing pending data…');
      const { xpSynced, scoresSynced } = await syncPendingData();
      if (xpSynced > 0 || scoresSynced > 0) {
        console.log(`[OfflineSync] Synced ${xpSynced} XP, ${scoresSynced} scores`);
        // Refresh progress from server after sync
        fetchProgress();
      }
    };

    window.addEventListener('online', handleOnline);
    // Also try syncing on mount in case we came online while the app was closed
    handleOnline();

    return () => window.removeEventListener('online', handleOnline);
  }, [userId]);

  const fetchProgress = useCallback(async () => {
    if (!userId) return;

    setError(null);
    try {
      // Transient network/5xx/429 failures are retried with exponential backoff.
      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data;
      });


      if (data) {
        // Check and update streak
        const today = localDateKey();
        const lastActivity = data.last_activity_date;

        if (lastActivity) {
          const diffDays = daysBetweenLocal(lastActivity);

          if (diffDays > 1) {
            const freezes = (data as any).streak_freezes ?? 0;
            const freezeUsedDate = (data as any).streak_freeze_used_date;

            // Use a streak freeze if available and not already used today
            if (diffDays === 2 && freezes > 0 && freezeUsedDate !== today) {
              try {
                await supabase
                  .from('user_progress')
                  .update({
                    streak_freezes: freezes - 1,
                    streak_freeze_used_date: today,
                  } as any)
                  .eq('user_id', userId);
                (data as any).streak_freezes = freezes - 1;
                (data as any).streak_freeze_used_date = today;
                console.log('[Streak] Freeze used — streak preserved!');
              } catch (err) {
                console.error('Error using streak freeze:', err);
              }
            } else {
              // Reset streak — missed too many days or no freeze available
              try {
                await supabase
                  .from('user_progress')
                  .update({ streak_days: 0, goal_streak: 0 } as any)
                  .eq('user_id', userId);
              } catch (err) {
                console.error('Error resetting streak:', err);
              }
              data.streak_days = 0;
              (data as any).goal_streak = 0;
            }
          }
        }

        setProgress(data);
        setCachedProgress(data);
      } else {
        // Create initial progress
        const initialProgress = {
          user_id: userId,
          xp: 0,
          streak_days: 0,
          lessons_completed: 0,
          total_lessons: 5,
          level: 1,
          last_activity_date: null,
        };

        try {
          const { data: newData, error: insertError } = await supabase
            .from('user_progress')
            .insert(initialProgress)
            .select()
            .single();

          if (insertError) throw insertError;
          setProgress(newData);
          setCachedProgress(newData);
        } catch (insertErr) {
          console.error('Error creating progress:', insertErr);
          setProgress(initialProgress as any);
          setCachedProgress(initialProgress as any);
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      setError(error instanceof Error ? error : new Error('Failed to load progress'));
      // Try to restore from localStorage cache
      const cached = getCachedProgress();
      if (cached) {
        console.log('[OfflineSync] Using cached progress');
        setProgress({ ...cached, coins: cached.coins ?? 0, goal_streak: cached.goal_streak ?? 0, streak_freezes: cached.streak_freezes ?? 0, streak_freeze_used_date: cached.streak_freeze_used_date ?? null });
      } else {
        setProgress({
          xp: 0,
          coins: 0,
          streak_days: 0,
          lessons_completed: 0,
          total_lessons: 5,
          level: 1,
          last_activity_date: null,
          goal_streak: 0,
          streak_freezes: 0,
          streak_freeze_used_date: null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const addXP = useCallback(
    async (amount: number) => {
      if (!userId || !progress) return;

      const today = localDateKey();
      const isNewDay = progress.last_activity_date !== today;

      const multiplier = getMultiplier(progress.goal_streak);
      const doubleXPUntil = Number(localStorage.getItem('speakgenie_double_xp_until') || '0');
      const doubleXPActive = doubleXPUntil > Date.now();
      const boostedAmount = Math.round(amount * multiplier * (doubleXPActive ? 2 : 1));
      const newXP = progress.xp + boostedAmount;
      const coinsEarned = Math.floor(boostedAmount / 10);
      const newCoins = progress.coins + coinsEarned;
      const newLevel = Math.floor(newXP / 500) + 1;
      const newStreak = isNewDay ? progress.streak_days + 1 : progress.streak_days;
      const leveledUpNow = newLevel > progress.level;

      const updatedProgress: UserProgress = {
        ...progress,
        xp: newXP,
        coins: newCoins,
        level: newLevel,
        streak_days: newStreak,
        last_activity_date: today,
      };

      // Update locally first (optimistic)
      setProgress(updatedProgress);
      setCachedProgress(updatedProgress);

      // Trigger level-up celebration
      if (leveledUpNow) {
        setLeveledUp(newLevel);
      }

      // Then try to persist
      try {
        const { error } = await supabase
          .from('user_progress')
          .update({
            xp: newXP,
            coins: newCoins,
            level: newLevel,
            streak_days: newStreak,
            last_activity_date: today,
          } as any)
          .eq('user_id', userId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating XP – queuing for sync:', error);
        queuePendingXP(userId, amount);
      }

      // Update daily goal xp_earned
      try {
        const { data: goal } = await supabase
          .from('daily_goals')
          .select('xp_earned')
          .eq('user_id', userId)
          .eq('goal_date', today)
          .maybeSingle();

        if (goal) {
          await supabase
            .from('daily_goals')
            .update({ xp_earned: goal.xp_earned + boostedAmount })
            .eq('user_id', userId)
            .eq('goal_date', today);
        }
      } catch (err) {
        console.error('Error updating daily goal:', err);
      }
    },
    [userId, progress]
  );

  const completeLesson = useCallback(async () => {
    if (!userId || !progress) return;

    const newLessonsCompleted = Math.min(
      progress.lessons_completed + 1,
      progress.total_lessons
    );

    // Optimistic local update
    const updatedProgress = { ...progress, lessons_completed: newLessonsCompleted };
    setProgress(updatedProgress);
    setCachedProgress(updatedProgress);

    try {
      const { error } = await supabase
        .from('user_progress')
        .update({ lessons_completed: newLessonsCompleted })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error completing lesson:', error);
    }
  }, [userId, progress]);

  const dismissLevelUp = useCallback(() => setLeveledUp(null), []);

  const spendCoins = useCallback(
    async (amount: number) => {
      if (!userId || !progress) return false;
      if (progress.coins < amount) return false;
      const newCoins = progress.coins - amount;
      const updated = { ...progress, coins: newCoins };
      setProgress(updated);
      setCachedProgress(updated);
      try {
        const { error } = await supabase
          .from('user_progress')
          .update({ coins: newCoins } as any)
          .eq('user_id', userId);
        if (error) throw error;
        return true;
      } catch {
        return false;
      }
    },
    [userId, progress]
  );

  return { progress, loading, error, addXP, spendCoins, completeLesson, refetch: fetchProgress, leveledUp, dismissLevelUp };
};
