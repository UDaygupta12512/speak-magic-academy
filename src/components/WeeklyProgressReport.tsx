import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, BookOpen, Target, Flame, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from "recharts";

interface WeeklyProgressReportProps {
  userId: string | null;
  streak: number;
}

interface DayData {
  day: string;
  date: string;
  wordsPracticed: number;
  accuracy: number;
  xp: number;
  active: boolean;
}

const WeeklyProgressReport = ({ userId, streak }: WeeklyProgressReportProps) => {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchWeeklyData = async () => {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [flashcardsRes, scoresRes, sessionsRes] = await Promise.all([
        supabase
          .from("flashcards")
          .select("updated_at, correct_count, review_count")
          .eq("user_id", userId)
          .gte("updated_at", sevenDaysAgo.toISOString()),
        supabase
          .from("game_scores")
          .select("created_at, score, max_score")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("activity_sessions")
          .select("created_at, xp_earned")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      const flashcards = flashcardsRes.data ?? [];
      const scores = scoresRes.data ?? [];
      const sessions = sessionsRes.data ?? [];

      const days: DayData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });

        const dayWords = flashcards.filter(f => f.updated_at.slice(0, 10) === dateKey).length;
        const dayScores = scores.filter(s => s.created_at.slice(0, 10) === dateKey);
        const totalScore = dayScores.reduce((s, g) => s + g.score, 0);
        const totalMax = dayScores.reduce((s, g) => s + (g.max_score || 1), 0);
        const dayAccuracy = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        const dayXp = sessions.reduce((s, sess) => sess.created_at.slice(0, 10) === dateKey ? s + sess.xp_earned : s, 0);

        days.push({
          day: label,
          date: dateKey,
          wordsPracticed: dayWords,
          accuracy: dayAccuracy,
          xp: dayXp,
          active: dayXp > 0 || dayWords > 0,
        });
      }

      setWeekData(days);
      setLoading(false);
    };

    fetchWeeklyData();
  }, [userId]);

  const totals = useMemo(() => {
    const totalWords = weekData.reduce((s, d) => s + d.wordsPracticed, 0);
    const totalXp = weekData.reduce((s, d) => s + d.xp, 0);
    const activeDays = weekData.filter(d => d.active).length;
    const accuracyDays = weekData.filter(d => d.accuracy > 0);
    const avgAccuracy = accuracyDays.length > 0
      ? Math.round(accuracyDays.reduce((s, d) => s + d.accuracy, 0) / accuracyDays.length)
      : 0;
    return { totalWords, totalXp, activeDays, avgAccuracy };
  }, [weekData]);

  if (loading) return null;

  const hasData = weekData.some(d => d.active);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card rounded-2xl shadow-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Weekly Report</h2>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { icon: BookOpen, label: "Words", value: totals.totalWords, color: "text-[hsl(var(--turquoise))]" },
          { icon: Target, label: "Accuracy", value: `${totals.avgAccuracy}%`, color: "text-[hsl(var(--green))]" },
          { icon: Flame, label: "Streak", value: streak, color: "text-[hsl(var(--orange))]" },
          { icon: TrendingUp, label: "XP", value: totals.totalXp, color: "text-[hsl(var(--purple))]" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
            <p className="font-bold text-foreground text-sm">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {!hasData ? (
        <p className="text-muted-foreground text-sm text-center py-4">No activity this week yet — start learning!</p>
      ) : (
        <>
          {/* Streak calendar dots */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Activity streak</p>
            <div className="flex justify-between">
              {weekData.map((d) => (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      d.active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d.day.charAt(0)}
                  </div>
                  {d.active && (
                    <Flame className="w-3 h-3 text-[hsl(var(--orange))]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Words practiced bar chart */}
          {totals.totalWords > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Words practiced</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekData}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "0.7rem" }}
                      formatter={(v: number) => [`${v} words`, "Practiced"]}
                    />
                    <Bar dataKey="wordsPracticed" fill="hsl(var(--turquoise))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Accuracy trend line */}
          {totals.avgAccuracy > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quiz accuracy trend</p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekData.filter(d => d.accuracy > 0)}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "0.7rem" }}
                      formatter={(v: number) => [`${v}%`, "Accuracy"]}
                    />
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--green))" strokeWidth={2} dot={{ fill: "hsl(var(--green))", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default WeeklyProgressReport;
