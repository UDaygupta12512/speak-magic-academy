import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "./useUserId";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

/**
 * Achievement definitions with programmatic check logic.
 * Each entry maps an achievement_id → a check function that receives stats
 * and returns true when the milestone is met.
 */
interface Stats {
  xp: number;
  streak: number;
  lessons: number;
  chats: number;
  stories: number;
  games: number;
  perfectGames: number;
  dailyChallenges: number;
  flashcardReviews: number;
  writings: number;
}

interface AchievementDef {
  id: string;
  name: string;
  check: (s: Stats) => boolean;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Lessons
  { id: "first_lesson", name: "First Steps", check: (s) => s.lessons >= 1 },
  // XP
  { id: "xp_100", name: "Rising Star", check: (s) => s.xp >= 100 },
  { id: "xp_500", name: "XP Hunter", check: (s) => s.xp >= 500 },
  { id: "xp_1000", name: "XP Master", check: (s) => s.xp >= 1000 },
  // Streaks
  { id: "streak_3", name: "Getting Started", check: (s) => s.streak >= 3 },
  { id: "streak_7", name: "Week Warrior", check: (s) => s.streak >= 7 },
  { id: "streak_30", name: "Monthly Champion", check: (s) => s.streak >= 30 },
  // Chats
  { id: "chat_1", name: "First Chat", check: (s) => s.chats >= 1 },
  { id: "chat_10", name: "Chatty Friend", check: (s) => s.chats >= 10 },
  // Stories
  { id: "story_1", name: "Story Lover", check: (s) => s.stories >= 1 },
  { id: "story_5", name: "Bookworm", check: (s) => s.stories >= 5 },
  // Games
  { id: "word_master_10", name: "Word Explorer", check: (s) => s.games >= 10 },
  { id: "word_master_50", name: "Vocabulary Builder", check: (s) => s.games >= 50 },
  { id: "perfect_game", name: "Perfect Score", check: (s) => s.perfectGames >= 1 },
  // Daily challenges
  { id: "daily_challenge", name: "Challenge Accepted", check: (s) => s.dailyChallenges >= 1 },
  { id: "daily_challenge_7", name: "Challenge Champion", check: (s) => s.dailyChallenges >= 7 },
  // Flashcards
  { id: "flashcard_master", name: "Flash Master", check: (s) => s.flashcardReviews >= 50 },
  // Writing
  { id: "writing_star", name: "Writing Star", check: (s) => s.writings >= 5 },
];

export function useAchievementChecker() {
  const userId = useUserId();
  const runningRef = useRef(false);

  const checkAndGrant = useCallback(async () => {
    if (!userId || runningRef.current) return;
    runningRef.current = true;

    try {
      // 1. Fetch already-earned achievements
      const { data: earned } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      const earnedSet = new Set((earned ?? []).map((a) => a.achievement_id));

      // Skip if all earned
      const unearnedDefs = ACHIEVEMENT_DEFS.filter((d) => !earnedSet.has(d.id));
      if (unearnedDefs.length === 0) return;

      // 2. Gather stats in parallel
      const [progressRes, chatsRes, sessionsRes, scoresRes, challengesRes, flashcardsRes, writingsRes] =
        await Promise.all([
          supabase.from("user_progress").select("xp, streak_days, lessons_completed").eq("user_id", userId).maybeSingle(),
          supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user"),
          supabase.from("activity_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
          supabase.from("game_scores").select("score, max_score").eq("user_id", userId),
          supabase.from("user_daily_challenge_progress").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
          supabase.from("flashcards").select("review_count").eq("user_id", userId),
          supabase.from("writing_exercises").select("id", { count: "exact", head: true }).eq("user_id", userId),
        ]);

      const p = progressRes.data;
      const totalFlashcardReviews = (flashcardsRes.data ?? []).reduce((s, f) => s + f.review_count, 0);
      const perfectGames = (scoresRes.data ?? []).filter((g) => g.score > 0 && g.score === g.max_score).length;

      const stats: Stats = {
        xp: p?.xp ?? 0,
        streak: p?.streak_days ?? 0,
        lessons: p?.lessons_completed ?? 0,
        chats: chatsRes.count ?? 0,
        stories: sessionsRes.count ?? 0, // approximate — story sessions
        games: (scoresRes.data ?? []).length,
        perfectGames,
        dailyChallenges: challengesRes.count ?? 0,
        flashcardReviews: totalFlashcardReviews,
        writings: writingsRes.count ?? 0,
      };

      // 3. Check & grant
      const newlyEarned: string[] = [];
      for (const def of unearnedDefs) {
        if (def.check(stats)) {
          const { error } = await supabase.from("user_achievements").insert({
            user_id: userId,
            achievement_id: def.id,
          });
          if (!error) newlyEarned.push(def.name);
        }
      }

      // 4. Celebrate & show toast for newly earned
      if (newlyEarned.length > 0) {
        // Fire confetti burst
        const duration = 2000;
        const end = Date.now() + duration;
        const fire = () => {
          confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.6 },
            colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#F97316"],
          });
          if (Date.now() < end) requestAnimationFrame(fire);
        };
        fire();

        toast({
          title: "🏆 Achievement Unlocked!",
          description: newlyEarned.join(", "),
        });
      }
    } catch (err) {
      console.error("[Achievements] check error:", err);
    } finally {
      runningRef.current = false;
    }
  }, [userId]);

  return { checkAndGrant };
}
