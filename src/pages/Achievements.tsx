import { motion } from "framer-motion";
import { Trophy, Star, Flame, BookOpen, MessageCircle, Zap, Target, Award, Medal, Crown, Sparkles, Heart } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { useUserId } from "@/hooks/useUserId";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  requirement: string;
  xpReward: number;
}

const achievementsList: Achievement[] = [
  { id: "first_lesson", name: "First Steps", description: "Complete your first lesson", icon: Star, color: "bg-yellow text-yellow-foreground", requirement: "lessons >= 1", xpReward: 10 },
  { id: "word_master_10", name: "Word Explorer", description: "Learn 10 new words", icon: BookOpen, color: "bg-[hsl(var(--turquoise))] text-primary-foreground", requirement: "words >= 10", xpReward: 25 },
  { id: "word_master_50", name: "Vocabulary Builder", description: "Learn 50 new words", icon: BookOpen, color: "bg-[hsl(var(--turquoise))] text-primary-foreground", requirement: "words >= 50", xpReward: 100 },
  { id: "streak_3", name: "Getting Started", description: "Maintain a 3-day streak", icon: Flame, color: "bg-[hsl(var(--orange))] text-secondary-foreground", requirement: "streak >= 3", xpReward: 30 },
  { id: "streak_7", name: "Week Warrior", description: "Maintain a 7-day streak", icon: Flame, color: "bg-[hsl(var(--orange))] text-secondary-foreground", requirement: "streak >= 7", xpReward: 75 },
  { id: "streak_30", name: "Monthly Champion", description: "Maintain a 30-day streak", icon: Crown, color: "bg-[hsl(var(--purple))] text-accent-foreground", requirement: "streak >= 30", xpReward: 300 },
  { id: "xp_100", name: "Rising Star", description: "Earn 100 XP", icon: Zap, color: "bg-[hsl(var(--yellow))] text-foreground", requirement: "xp >= 100", xpReward: 15 },
  { id: "xp_500", name: "XP Hunter", description: "Earn 500 XP", icon: Zap, color: "bg-[hsl(var(--yellow))] text-foreground", requirement: "xp >= 500", xpReward: 50 },
  { id: "xp_1000", name: "XP Master", description: "Earn 1000 XP", icon: Trophy, color: "bg-[hsl(var(--purple))] text-accent-foreground", requirement: "xp >= 1000", xpReward: 100 },
  { id: "chat_1", name: "First Chat", description: "Complete your first AI conversation", icon: MessageCircle, color: "bg-[hsl(var(--pink))] text-primary-foreground", requirement: "chats >= 1", xpReward: 20 },
  { id: "chat_10", name: "Chatty Friend", description: "Complete 10 AI conversations", icon: MessageCircle, color: "bg-[hsl(var(--pink))] text-primary-foreground", requirement: "chats >= 10", xpReward: 75 },
  { id: "story_1", name: "Story Lover", description: "Listen to your first story", icon: Heart, color: "bg-[hsl(var(--pink))] text-primary-foreground", requirement: "stories >= 1", xpReward: 15 },
  { id: "story_5", name: "Bookworm", description: "Listen to 5 stories", icon: Heart, color: "bg-[hsl(var(--pink))] text-primary-foreground", requirement: "stories >= 5", xpReward: 50 },
  { id: "perfect_game", name: "Perfect Score", description: "Get 100% on any word game", icon: Target, color: "bg-[hsl(var(--green))] text-primary-foreground", requirement: "perfect_game", xpReward: 40 },
  { id: "daily_challenge", name: "Challenge Accepted", description: "Complete your first daily challenge", icon: Award, color: "bg-[hsl(var(--purple))] text-accent-foreground", requirement: "daily_challenges >= 1", xpReward: 25 },
  { id: "daily_challenge_7", name: "Challenge Champion", description: "Complete 7 daily challenges", icon: Medal, color: "bg-[hsl(var(--purple))] text-accent-foreground", requirement: "daily_challenges >= 7", xpReward: 100 },
  { id: "flashcard_master", name: "Flash Master", description: "Review 50 flashcards", icon: Sparkles, color: "bg-[hsl(var(--yellow))] text-foreground", requirement: "flashcard_reviews >= 50", xpReward: 60 },
  { id: "writing_star", name: "Writing Star", description: "Complete 5 writing exercises", icon: Star, color: "bg-[hsl(var(--turquoise))] text-primary-foreground", requirement: "writings >= 5", xpReward: 75 },
];

const Achievements = () => {
  const userId = useUserId();
  const [earnedAchievements, setEarnedAchievements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { checkAndGrant } = useAchievementChecker();

  useEffect(() => {
    const fetchAndCheck = async () => {
      if (!userId) return;

      // Run checker first to grant any new achievements
      await checkAndGrant();

      // Then fetch all earned
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      if (!error && data) {
        setEarnedAchievements(new Set(data.map((a) => a.achievement_id)));
      }
      setLoading(false);
    };

    fetchAndCheck();
  }, [userId, checkAndGrant]);

  const earnedCount = earnedAchievements.size;
  const totalCount = achievementsList.length;
  const progressPercent = Math.round((earnedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Achievements"
        icon={<Trophy className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Progress Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-foreground text-lg">Your Progress</h2>
              <p className="text-muted-foreground text-sm">
                {earnedCount} of {totalCount} achievements earned
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-[hsl(180,70%,40%)] flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">{progressPercent}%</span>
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-primary to-[hsl(var(--green))] rounded-full"
            />
          </div>
        </motion.div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 gap-3">
          {achievementsList.map((achievement, index) => {
            const isEarned = earnedAchievements.has(achievement.id);
            const Icon = achievement.icon;

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-card rounded-2xl shadow-card p-4 relative overflow-hidden ${
                  !isEarned ? "opacity-50 grayscale" : ""
                }`}
              >
                {isEarned && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 rounded-full bg-[hsl(var(--green))] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl ${achievement.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-foreground text-sm mb-1">{achievement.name}</h3>
                <p className="text-muted-foreground text-xs leading-tight">{achievement.description}</p>
                <div className="mt-2 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[hsl(var(--yellow))]" />
                  <span className="text-xs font-semibold text-muted-foreground">+{achievement.xpReward} XP</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Achievements;
