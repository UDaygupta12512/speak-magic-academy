import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface WeeklyGoalChartProps {
  userId: string | null;
}

interface DayGoal {
  day: string;
  date: string;
  xpEarned: number;
  xpTarget: number;
  completed: boolean;
}

const WeeklyGoalChart = ({ userId }: WeeklyGoalChartProps) => {
  const [data, setData] = useState<DayGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      const startDate = sevenDaysAgo.toISOString().slice(0, 10);

      const { data: goals } = await supabase
        .from("daily_goals")
        .select("goal_date, xp_earned, xp_target")
        .eq("user_id", userId)
        .gte("goal_date", startDate)
        .order("goal_date", { ascending: true });

      const goalMap = new Map(
        (goals ?? []).map((g) => [g.goal_date, g])
      );

      const days: DayGoal[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        const goal = goalMap.get(dateKey);

        days.push({
          day: label,
          date: dateKey,
          xpEarned: goal?.xp_earned ?? 0,
          xpTarget: goal?.xp_target ?? 0,
          completed: goal ? goal.xp_earned >= goal.xp_target : false,
        });
      }

      setData(days);
      setLoading(false);
    };

    fetch();
  }, [userId]);

  if (loading) return null;

  const completedDays = data.filter((d) => d.completed).length;
  const hasGoals = data.some((d) => d.xpTarget > 0);

  if (!hasGoals) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-4 bg-card rounded-2xl shadow-card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Daily Goal Completion</h2>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {completedDays}/7 days
        </span>
      </div>

      {/* Completion dots */}
      <div className="flex justify-between mb-4">
        {data.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                d.completed
                  ? "bg-[hsl(var(--green))] text-primary-foreground"
                  : d.xpTarget > 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/50 text-muted-foreground/50"
              }`}
            >
              {d.completed ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                d.day.charAt(0)
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>

      {/* XP bar chart: earned vs target */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "0.7rem",
              }}
              formatter={(value: number, name: string) => [
                `${value} XP`,
                name === "xpEarned" ? "Earned" : "Target",
              ]}
            />
            <Bar dataKey="xpTarget" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="xpEarned" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.completed
                      ? "hsl(var(--green))"
                      : "hsl(var(--primary))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="flex justify-around text-center border-t border-border pt-3 mt-3">
        <div>
          <p className="text-lg font-bold text-foreground">{completedDays}</p>
          <p className="text-xs text-muted-foreground">Goals Met</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">
            {Math.round(
              (completedDays / Math.max(data.filter((d) => d.xpTarget > 0).length, 1)) * 100
            )}%
          </p>
          <p className="text-xs text-muted-foreground">Success Rate</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">
            {data.reduce((s, d) => s + d.xpEarned, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total XP</p>
        </div>
      </div>
    </motion.div>
  );
};

export default WeeklyGoalChart;
