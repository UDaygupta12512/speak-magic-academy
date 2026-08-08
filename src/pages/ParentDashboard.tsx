import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Trophy,
  Flame,
  Star,
  Target,
  BookOpen,
  MessageCircle,
  Gamepad2,
  PenTool,
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserId } from "@/hooks/useUserId";
import { useProgress } from "@/hooks/useProgress";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import AudioStoryReport from "@/components/AudioStoryReport";
import ParentWeeklyGoal from "@/components/ParentWeeklyGoal";

interface ActivityBreakdown {
  type: string;
  count: number;
  totalMinutes: number;
  xpEarned: number;
}

interface RecentSession {
  activity_type: string;
  created_at: string;
  duration_seconds: number | null;
  xp_earned: number;
  completed: boolean;
}

interface EarnedAchievement {
  achievement_id: string;
  earned_at: string;
}

const ACTIVITY_LABELS: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
  chat: { label: "AI Chat", icon: MessageCircle, color: "bg-pink text-primary-foreground" },
  roleplay: { label: "Roleplay", icon: MessageCircle, color: "bg-purple text-primary-foreground" },
  word_meaning: { label: "Word Meaning", icon: BookOpen, color: "bg-turquoise text-primary-foreground" },
  word_games: { label: "Word Games", icon: Gamepad2, color: "bg-orange text-primary-foreground" },
  phonics: { label: "Phonics", icon: BookOpen, color: "bg-green text-primary-foreground" },
  sentence_builder: { label: "Sentences", icon: PenTool, color: "bg-yellow text-foreground" },
  flashcards: { label: "Flashcards", icon: BookOpen, color: "bg-purple text-primary-foreground" },
  daily_challenge: { label: "Daily Challenge", icon: Target, color: "bg-orange text-primary-foreground" },
  writing: { label: "Writing", icon: PenTool, color: "bg-turquoise text-primary-foreground" },
  pronunciation: { label: "Pronunciation", icon: MessageCircle, color: "bg-pink text-primary-foreground" },
  vocab_quiz: { label: "Vocab Quiz", icon: BookOpen, color: "bg-green text-primary-foreground" },
  grammar: { label: "Grammar", icon: BookOpen, color: "bg-purple text-primary-foreground" },
  listening: { label: "Listening", icon: BookOpen, color: "bg-turquoise text-primary-foreground" },
  spelling_bee: { label: "Spelling Bee", icon: Star, color: "bg-yellow text-foreground" },
  reading: { label: "Reading", icon: BookOpen, color: "bg-green text-primary-foreground" },
  story: { label: "Stories", icon: BookOpen, color: "bg-pink text-primary-foreground" },
};

const ACHIEVEMENT_NAMES: Record<string, string> = {
  first_lesson: "First Steps",
  xp_100: "Rising Star",
  xp_500: "XP Hunter",
  xp_1000: "XP Master",
  streak_3: "Getting Started",
  streak_7: "Week Warrior",
  streak_30: "Monthly Champion",
  chat_1: "First Chat",
  chat_10: "Chatty Friend",
  story_1: "Story Lover",
  story_5: "Bookworm",
  word_master_10: "Word Explorer",
  word_master_50: "Vocabulary Builder",
  perfect_game: "Perfect Score",
  daily_challenge: "Challenge Accepted",
  daily_challenge_7: "Challenge Champion",
  flashcard_master: "Flash Master",
  writing_star: "Writing Star",
};

const ParentDashboard = () => {
  const navigate = useNavigate();
  const userId = useUserId();
  const { progress, loading: progressLoading } = useProgress();

  const [activityBreakdown, setActivityBreakdown] = useState<ActivityBreakdown[]>([]);
  const [allSessions, setAllSessions] = useState<RecentSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const [sessionsRes, achievementsRes] = await Promise.all([
        supabase
          .from("activity_sessions")
          .select("activity_type, created_at, duration_seconds, xp_earned, completed")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_achievements")
          .select("achievement_id, earned_at")
          .eq("user_id", userId)
          .order("earned_at", { ascending: false }),
      ]);

      const sessions = sessionsRes.data ?? [];
      setAllSessions(sessions);
      setRecentSessions(sessions.slice(0, 10));
      setAchievements(achievementsRes.data ?? []);
      setTotalSessions(sessions.length);

      // Compute breakdown
      const byType: Record<string, { count: number; totalSeconds: number; xp: number }> = {};
      let totalSeconds = 0;

      for (const s of sessions) {
        const t = s.activity_type;
        if (!byType[t]) byType[t] = { count: 0, totalSeconds: 0, xp: 0 };
        byType[t].count++;
        byType[t].totalSeconds += s.duration_seconds ?? 0;
        byType[t].xp += s.xp_earned;
        totalSeconds += s.duration_seconds ?? 0;
      }

      setTotalTimeMinutes(Math.round(totalSeconds / 60));
      setActivityBreakdown(
        Object.entries(byType)
          .map(([type, data]) => ({
            type,
            count: data.count,
            totalMinutes: Math.round(data.totalSeconds / 60),
            xpEarned: data.xp,
          }))
          .sort((a, b) => b.count - a.count)
      );

      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const xp = progress?.xp ?? 0;
  const streak = progress?.streak_days ?? 0;
  const level = progress?.level ?? 1;
  const lessonsCompleted = progress?.lessons_completed ?? 0;

  const weeklyXpData = useMemo(() => {
    const days: { day: string; xp: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayXp = allSessions.reduce((sum, s) => {
        return s.created_at.slice(0, 10) === key ? sum + s.xp_earned : sum;
      }, 0);
      days.push({ day: label, xp: dayXp });
    }
    return days;
  }, [allSessions]);

  const hasWeeklyData = weeklyXpData.some((d) => d.xp > 0);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <main className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[hsl(var(--purple))] to-[hsl(280,65%,55%)] text-primary-foreground p-6 pb-10 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-11 h-11 rounded-full bg-primary-foreground/20 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Parent Dashboard</h1>
              <p className="text-primary-foreground/80 text-sm">Track your child's learning journey</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 space-y-4">
        {/* Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { icon: Star, label: "Total XP", value: xp.toLocaleString(), gradient: "card-yellow" },
            { icon: Flame, label: "Day Streak", value: `${streak}`, gradient: "card-orange" },
            { icon: Clock, label: "Time Spent", value: `${totalTimeMinutes}m`, gradient: "card-turquoise" },
            { icon: Trophy, label: "Level", value: `${level}`, gradient: "card-purple" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`${stat.gradient} rounded-2xl p-4 text-primary-foreground`}
            >
              <stat.icon className="w-6 h-6 mb-2 opacity-90" />
              <p className="text-2xl font-bold">{progressLoading || loading ? "…" : stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Weekly Learning Goal (bilingual) */}
        <ParentWeeklyGoal userId={userId} />

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Learning Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{lessonsCompleted}</p>
              <p className="text-xs text-muted-foreground">Lessons Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">Activities</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{achievements.length}</p>
              <p className="text-xs text-muted-foreground">Badges Earned</p>
            </div>
          </div>
        </motion.div>

        {/* Weekly XP Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Weekly XP</h2>
          </div>
          {hasWeeklyData ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyXpData}>
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                      }}
                      formatter={(value: number) => [`${value} XP`, "XP Earned"]}
                    />
                    <Bar dataKey="xp" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No XP earned this week yet</p>
            )}
        </motion.div>

        {/* Activity Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Activity Breakdown</h2>
          </div>
          {activityBreakdown.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No activities recorded yet</p>
          ) : (
            <div className="space-y-3">
              {activityBreakdown.slice(0, 8).map((activity) => {
                const meta = ACTIVITY_LABELS[activity.type] ?? {
                  label: activity.type,
                  icon: BookOpen,
                  color: "bg-muted text-foreground",
                };
                const Icon = meta.icon;
                const maxCount = activityBreakdown[0]?.count ?? 1;
                const barWidth = Math.max(10, (activity.count / maxCount) * 100);

                return (
                  <div key={activity.type} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{meta.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {activity.count} sessions · {activity.xpEarned} XP
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-foreground">Badges Earned</h2>
            </div>
            <button
              onClick={() => navigate("/achievements")}
              className="text-primary text-sm font-semibold"
            >
              View All
            </button>
          </div>
          {achievements.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No badges earned yet — keep learning!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <motion.div
                  key={a.achievement_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-yellow" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {ACHIEVEMENT_NAMES[a.achievement_id] ?? a.achievement_id}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(a.earned_at)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl shadow-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Recent Activity</h2>
          </div>
          {recentSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session, i) => {
                const meta = ACTIVITY_LABELS[session.activity_type] ?? {
                  label: session.activity_type,
                  icon: BookOpen,
                  color: "bg-muted text-foreground",
                };
                const Icon = meta.icon;
                const mins = session.duration_seconds ? Math.round(session.duration_seconds / 60) : 0;

                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.created_at)} at {formatTime(session.created_at)}
                        {mins > 0 && ` · ${mins} min`}
                        {session.xp_earned > 0 && ` · +${session.xp_earned} XP`}
                      </p>
                    </div>
                    {session.completed && (
                      <div className="w-5 h-5 rounded-full bg-green flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Audio Stories Report */}
        <AudioStoryReport userId={userId} />
      </div>
    </main>
  );
};

export default ParentDashboard;
