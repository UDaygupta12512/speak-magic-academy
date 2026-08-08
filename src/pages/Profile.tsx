import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Bell, HelpCircle, LogOut, ChevronRight, Star, Trophy, Flame, Target, BarChart3, BookOpen, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled } from "@/hooks/useFeedback";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ProgressRing from "@/components/ProgressRing";
import mascotImage from "@/assets/genie-mascot.png";
import AvatarWithFrame from "@/components/AvatarWithFrame";
import { useProgress } from "@/hooks/useProgress";
import { useUserId } from "@/hooks/useUserId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import WeeklyProgressReport from "@/components/WeeklyProgressReport";
import StreakCalendar from "@/components/StreakCalendar";
import WeeklyGoalChart from "@/components/WeeklyGoalChart";
import FrameCollection from "@/components/FrameCollection";
import AudioStoryReport from "@/components/AudioStoryReport";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { useRewardStatus, REWARD_SCHEDULE } from "@/hooks/useRewardStatus";
import { Gift, Calendar, Clock } from "lucide-react";

const ThemeToggleRow = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors border-b border-border"
    >
      <div className="flex items-center gap-3">
        {isDark ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
        <span className="font-medium text-foreground">Dark Mode</span>
      </div>
      <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${isDark ? "bg-primary" : "bg-muted"}`}>
        <motion.div
          className="w-5 h-5 rounded-full bg-primary-foreground shadow-sm"
          animate={{ x: isDark ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
};

const SoundToggleRow = () => {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
  };

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors border-b border-border"
    >
      <div className="flex items-center gap-3">
        {enabled ? <Volume2 className="w-5 h-5 text-muted-foreground" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
        <span className="font-medium text-foreground">Sound Effects</span>
      </div>
      <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
        <motion.div
          className="w-5 h-5 rounded-full bg-primary-foreground shadow-sm"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
};

const SignOutRow = () => {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const handle = async () => {
    await signOut();
    nav("/auth", { replace: true });
  };
  return (
    <button
      onClick={handle}
      className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <LogOut className="w-5 h-5 text-destructive" aria-hidden />
        <span className="font-medium text-destructive">Sign out</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" aria-hidden />
    </button>
  );
};

const menuItems = [
  { icon: BarChart3, label: "Parent Dashboard", path: "/parent" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { progress, loading } = useProgress();
  const userId = useUserId();

  const [flashcardStats, setFlashcardStats] = useState({
    total: 0,
    mastered: 0,   // difficulty 4-5
    learning: 0,   // difficulty 2-3
    newCards: 0,    // difficulty 1
    totalReviews: 0,
    accuracy: 0,
  });
  const [recentAchievements, setRecentAchievements] = useState<{ id: string; emoji: string; name: string }[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetchStats = async () => {
      try {
        const { data } = await supabase
          .from("flashcards")
          .select("difficulty, review_count, correct_count")
          .eq("user_id", userId);
        if (!data) return;
        const total = data.length;
        const mastered = data.filter(c => c.difficulty >= 4).length;
        const learning = data.filter(c => c.difficulty >= 2 && c.difficulty <= 3).length;
        const newCards = data.filter(c => c.difficulty <= 1).length;
        const totalReviews = data.reduce((s, c) => s + c.review_count, 0);
        const totalCorrect = data.reduce((s, c) => s + c.correct_count, 0);
        setFlashcardStats({
          total, mastered, learning, newCards, totalReviews,
          accuracy: totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0,
        });
      } catch (err) {
        console.error("Could not fetch flashcard stats:", err);
      }
    };
    fetchStats();

    const fetchAchievements = async () => {
      try {
        const { data } = await supabase
          .from("user_achievements")
          .select("achievement_id, earned_at")
          .eq("user_id", userId)
          .order("earned_at", { ascending: false })
          .limit(5);
        const META: Record<string, { emoji: string; name: string }> = {
          first_lesson: { emoji: "🌟", name: "First Steps" },
          xp_100: { emoji: "⚡", name: "Rising Star" },
          xp_500: { emoji: "💫", name: "XP Hunter" },
          xp_1000: { emoji: "🏆", name: "XP Master" },
          streak_3: { emoji: "🔥", name: "3-Day Streak" },
          streak_7: { emoji: "🔥", name: "Week Warrior" },
          streak_30: { emoji: "👑", name: "Monthly Champ" },
          chat_1: { emoji: "💬", name: "First Chat" },
          chat_10: { emoji: "🗣️", name: "Chatty Friend" },
          story_1: { emoji: "❤️", name: "Story Lover" },
          story_5: { emoji: "📚", name: "Bookworm" },
          word_master_10: { emoji: "📖", name: "Word Explorer" },
          word_master_50: { emoji: "🎓", name: "Vocab Builder" },
          perfect_game: { emoji: "🎯", name: "Perfect Score" },
          daily_challenge: { emoji: "🏅", name: "Challenge Accepted" },
          daily_challenge_7: { emoji: "🥇", name: "Challenge Champ" },
          flashcard_master: { emoji: "✨", name: "Flash Master" },
          writing_star: { emoji: "✍️", name: "Writing Star" },
        };
        setRecentAchievements(
          (data ?? []).map((a: any) => ({
            id: a.achievement_id,
            ...(META[a.achievement_id] ?? { emoji: "🏆", name: a.achievement_id }),
          }))
        );
      } catch (err) {
        console.error("Could not fetch achievements:", err);
      }
    };
    fetchAchievements();
  }, [userId]);

  const xp = progress?.xp ?? 0;
  const streak = progress?.streak_days ?? 0;
  const lessonsCompleted = progress?.lessons_completed ?? 0;
  const level = progress?.level ?? 1;
  const totalLessons = progress?.total_lessons ?? 5;
  const progressPercent = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

  const levelTitle = level <= 1 ? "Beginner" : level <= 3 ? "Explorer" : level <= 5 ? "Learner" : "Master";
  const rewardStatus = useRewardStatus();

  const stats = [
    { icon: Flame, label: "Streak", value: `${streak}`, color: "text-orange bg-orange-light" },
    { icon: Star, label: "Total XP", value: xp.toLocaleString(), color: "text-yellow bg-yellow-light" },
    { icon: Trophy, label: "Level", value: `${level}`, color: "text-purple bg-purple-light" },
    { icon: Target, label: "Lessons", value: `${lessonsCompleted}`, color: "text-green bg-green-light" },
  ];

  const difficultyBars = [
    { label: "New", count: flashcardStats.newCards, color: "bg-muted-foreground" },
    { label: "Learning", count: flashcardStats.learning, color: "bg-[hsl(var(--yellow))]" },
    { label: "Mastered", count: flashcardStats.mastered, color: "bg-[hsl(var(--green))]" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary to-[hsl(180,70%,40%)] text-primary-foreground p-6 pb-24 rounded-b-[2rem]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="mx-auto mb-4">
            <AvatarWithFrame level={level} src={mascotImage} alt="Profile" size={88} />
          </div>
          <h1 className="text-2xl font-bold">Explorer</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Level {level} • {levelTitle}</p>
        </motion.div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-16">
        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-foreground">Your Progress</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading..." : "Keep up the great work!"}
              </p>
            </div>
            <ProgressRing progress={progressPercent} size={60}>
              <span className="text-sm font-bold text-primary">{progressPercent}%</span>
            </ProgressRing>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-2" aria-busy="true" aria-label="Loading your stats">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="w-10 h-10 mx-auto rounded-xl mb-1" />
                  <Skeleton className="h-4 w-8 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-4 gap-2">

            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="text-center"
              >
                <div className={`w-10 h-10 mx-auto rounded-xl ${stat.color} flex items-center justify-center mb-1`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-foreground text-sm">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          )}

        </motion.div>

        {/* Flashcard Mastery */}
        {flashcardStats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 bg-card rounded-2xl shadow-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Flashcard Mastery</h2>
              </div>
              <span className="text-sm text-muted-foreground">{flashcardStats.total} cards</span>
            </div>
            <div className="space-y-2 mb-4">
              {difficultyBars.map((bar) => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16">{bar.label}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${bar.color}`}
                      style={{ width: `${flashcardStats.total > 0 ? (bar.count / flashcardStats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-6 text-right">{bar.count}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-around text-center border-t border-border pt-3">
              <div>
                <p className="text-lg font-bold text-foreground">{flashcardStats.totalReviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{flashcardStats.accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{flashcardStats.mastered}</p>
                <p className="text-xs text-muted-foreground">Mastered</p>
              </div>
            </div>
          </motion.div>
        )}
        {/* Frame Collection */}
        {/* Daily Reward Status */}
        {!rewardStatus.loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="mt-4 bg-card rounded-2xl shadow-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-[hsl(var(--yellow))]" />
                <h2 className="font-bold text-foreground">Daily Reward</h2>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                rewardStatus.claimedToday
                  ? "bg-[hsl(var(--green))]/15 text-[hsl(var(--green))]"
                  : "bg-[hsl(var(--yellow))]/20 text-[hsl(var(--yellow))]"
              }`}>
                {rewardStatus.claimedToday ? "✓ Claimed" : "Ready to claim"}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                {rewardStatus.nextReward.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {rewardStatus.claimedToday ? "Next reward" : "Today's reward"}
                </p>
                <p className="font-bold text-foreground">
                  Day {rewardStatus.nextDay} — {rewardStatus.nextReward.label}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  {rewardStatus.claimedToday ? (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>In ~{rewardStatus.hoursUntilReset}h • {rewardStatus.nextResetLabel}</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3 h-3" />
                      <span>Streak: {streak} day{streak === 1 ? "" : "s"}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 7-day progress dots */}
            <div className="grid grid-cols-7 gap-1.5">
              {REWARD_SCHEDULE.map((r, i) => {
                const dayNum = i + 1;
                const isPast = dayNum < rewardStatus.currentDay ||
                  (dayNum === rewardStatus.currentDay && rewardStatus.claimedToday);
                const isCurrent = dayNum === rewardStatus.nextDay && !rewardStatus.claimedToday;
                return (
                  <div
                    key={dayNum}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
                      isPast
                        ? "bg-[hsl(var(--green))]/15 text-[hsl(var(--green))]"
                        : isCurrent
                        ? "bg-primary/15 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="text-sm">{r.emoji}</span>
                    <span className="text-[9px] font-bold">D{dayNum}</span>
                  </div>
                );
              })}
            </div>

            {rewardStatus.cycleStreakBroken && (
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                Missed a day — cycle restarted at Day 1.
              </p>
            )}
          </motion.div>
        )}

        <FrameCollection currentLevel={level} />

        {/* Streak Calendar */}
        <StreakCalendar userId={userId} />

        {/* Weekly Goal Completion */}
        <WeeklyGoalChart userId={userId} />

        {/* Weekly Progress Report */}
        <WeeklyProgressReport userId={userId} streak={streak} />

        {/* Student Report — Audio Stories */}
        <div className="mt-4">
          <AudioStoryReport userId={userId} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">Recent Achievements</h2>
            <button
              onClick={() => navigate("/achievements")}
              className="text-primary text-sm font-semibold"
            >
              See All
            </button>
          </div>
          {recentAchievements.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-3xl mb-1 opacity-30">🏆</p>
              <p className="text-xs text-muted-foreground">No achievements yet — start learning to earn your first badge!</p>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {recentAchievements.map((a, index) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  title={a.name}
                  className="w-12 h-12 rounded-xl bg-yellow-light flex items-center justify-center text-2xl"
                >
                  {a.emoji}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Dark Mode & Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 bg-card rounded-2xl shadow-card overflow-hidden"
        >
          <ThemeToggleRow />
          <SoundToggleRow />
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between p-4 hover:bg-muted transition-colors border-b border-border`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
          <SignOutRow />
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
