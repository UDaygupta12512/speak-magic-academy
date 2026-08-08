import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, BookOpen, Target, ShoppingBag, Coins, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import StreakBadge from "@/components/StreakBadge";
import ProgressRing from "@/components/ProgressRing";
import mascotImage from "@/assets/genie-mascot.png";
import { useProgress } from "@/hooks/useProgress";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import DailyGoal from "@/components/DailyGoal";
import LevelUpCelebration from "@/components/LevelUpCelebration";
import AvatarWithFrame from "@/components/AvatarWithFrame";
import DailyLoginReward from "@/components/DailyLoginReward";
import OnboardingTour from "@/components/OnboardingTour";
import DidYouKnow from "@/components/DidYouKnow";
import AudioStories from "@/components/AudioStories";
import { useLastActivity } from "@/hooks/useLastActivity";

const Index = () => {
  const navigate = useNavigate();
  const { progress, loading, leveledUp, dismissLevelUp } = useProgress();
  const { checkAndGrant } = useAchievementChecker();
  const lastActivity = useLastActivity();

  // Check achievements on home page load
  useEffect(() => {
    if (!loading) checkAndGrant();
  }, [loading, checkAndGrant]);

  const xp = progress?.xp ?? 0;
  const coins = progress?.coins ?? 0;
  const streak = progress?.streak_days ?? 0;
  const level = progress?.level ?? 1;
  const lessonsCompleted = progress?.lessons_completed ?? 0;
  const totalLessons = progress?.total_lessons ?? 5;
  const progressPercent = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

  const quickActions = [
    {
      icon: BookOpen,
      label: "Learn",
      color: "card-turquoise",
      path: "/learn",
    },
    {
      icon: Target,
      label: "Practice",
      color: "card-orange",
      path: "/call",
    },
    {
      icon: Trophy,
      label: "Leaderboard",
      color: "card-yellow",
      path: "/leaderboard",
    },
    {
      icon: ShoppingBag,
      label: "Shop",
      color: "card-purple",
      path: "/shop",
    },
    {
      icon: Palette,
      label: "Comic Book",
      color: "card-green",
      path: "/comic-book",
    },
  ];

  return (
    <main className="min-h-screen bg-background pb-32">
      <OnboardingTour />
      <LevelUpCelebration level={leveledUp ?? 1} show={leveledUp !== null} onClose={dismissLevelUp} />
      {/* Header */}
      <header className="bg-gradient-to-br from-primary to-[hsl(180,70%,40%)] text-primary-foreground p-6 pb-16 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-primary-foreground/80 text-sm"
              >
                Welcome back! 👋
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold"
              >
                Explorer
              </motion.h1>
            </div>
            <StreakBadge streak={streak} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4"
          >
            <AvatarWithFrame
              level={level}
              src={mascotImage}
              alt="SpeakGenie mascot"
              size={72}
            />
            <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-2xl p-4 flex-1">
              <p className="text-sm font-medium">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Ready for today's adventure? Let's practice English together!
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Progress Card */}
      <div className="max-w-lg mx-auto px-4 -mt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="font-bold text-foreground mb-1">Today's Progress</h2>
              <p className="text-muted-foreground text-sm mb-4">
                {loading ? "Loading..." : "Keep going! You're doing great!"}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-light flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-yellow" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total XP</p>
                    <p className="font-bold text-foreground">{xp}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--yellow))]/15 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-[hsl(var(--yellow))]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Coins</p>
                    <p className="font-bold text-foreground">{coins}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-light flex items-center justify-center">
                    <Target className="w-4 h-4 text-green" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lessons</p>
                    <p className="font-bold text-foreground">{lessonsCompleted}/{totalLessons}</p>
                  </div>
                </div>
              </div>
            </div>
            <ProgressRing progress={progressPercent} size={90}>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{progressPercent}%</p>
              </div>
            </ProgressRing>
          </div>
        </motion.div>

        {/* Did You Know - Fun Fact */}
        <div className="mt-4">
          <DidYouKnow />
        </div>

        {/* Audio Stories */}
        <div className="mt-6">
          <AudioStories />
        </div>

        {/* Daily Login Reward */}
        <div className="mt-4">
          <DailyLoginReward />
        </div>

        {/* Daily Goal */}
        <div className="mt-4">
          <DailyGoal />
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <h2 className="font-bold text-foreground mb-3">Quick Start</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.path)}
                className={`${action.color} rounded-2xl p-5 text-white shadow-card`}
              >
                <action.icon className="w-8 h-8 mb-2" />
                <span className="font-bold">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Continue Learning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6"
        >
          <h2 className="font-bold text-foreground mb-3">Continue Learning</h2>
          <button
            onClick={() => navigate(lastActivity?.path ?? "/learn")}
            className="w-full bg-card rounded-2xl shadow-card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow"
          >
            <div className="w-16 h-16 card-purple rounded-xl flex items-center justify-center text-3xl">
              {lastActivity?.emoji ?? "📘"}
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-foreground">{lastActivity?.label ?? "Start Learning"}</h3>
              <p className="text-sm text-muted-foreground">
                {lastActivity
                  ? `Pick up where you left off • ${xp} XP earned`
                  : `Lesson ${lessonsCompleted} of ${totalLessons}`}
              </p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </button>
        </motion.div>
      </div>

      <BottomNav />
    </main>
  );
};

export default Index;
