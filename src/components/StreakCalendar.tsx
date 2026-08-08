import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Flame, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, isSameDay } from "date-fns";

interface StreakCalendarProps {
  userId: string | null;
}

const StreakCalendar = ({ userId }: StreakCalendarProps) => {
  const [activeDays, setActiveDays] = useState<Date[]>([]);
  const [goalDays, setGoalDays] = useState<Date[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetchActivity = async () => {
      const thirtyDaysAgo = subDays(new Date(), 29).toISOString();
      const { data: sessions } = await supabase
        .from("activity_sessions")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo);

      if (sessions) {
        const unique = new Map<string, Date>();
        sessions.forEach(s => {
          const d = startOfDay(new Date(s.created_at));
          unique.set(d.toISOString(), d);
        });
        setActiveDays(Array.from(unique.values()));
      }

      const { data: goals } = await supabase
        .from("daily_goals")
        .select("goal_date, xp_earned, xp_target")
        .eq("user_id", userId)
        .gte("goal_date", format(subDays(new Date(), 29), "yyyy-MM-dd"));

      if (goals) {
        setGoalDays(goals.filter(g => g.xp_earned >= g.xp_target).map(g => new Date(g.goal_date)));
      }
    };
    fetchActivity();
  }, [userId]);

  // Generate last 30 days
  const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));

  const isActive = (day: Date) => activeDays.some(d => isSameDay(d, day));
  const isGoalMet = (day: Date) => goalDays.some(d => isSameDay(d, day));
  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mt-4 bg-card rounded-2xl shadow-card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Streak Calendar</h2>
        </div>
        <span className="text-xs text-muted-foreground">Last 30 days</span>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-10 gap-1.5 mb-1">
        {days.slice(0, 10).map((day) => (
          <span key={day.toISOString()} className="text-[9px] text-muted-foreground text-center">
            {format(day, "EEE").charAt(0)}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-10 gap-1.5">
        {days.map((day, i) => {
          const active = isActive(day);
          const goal = isGoalMet(day);
          const today = isToday(day);

          return (
            <motion.div
              key={day.toISOString()}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.015 }}
              className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold relative
                ${goal ? "bg-[hsl(var(--green))] text-primary-foreground" :
                  active ? "bg-primary/80 text-primary-foreground" :
                  today ? "bg-muted ring-2 ring-primary text-foreground" :
                  "bg-muted text-muted-foreground"
                }`}
              title={format(day, "MMM d")}
            >
              {format(day, "d")}
              {goal && (
                <Flame className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-[hsl(var(--orange))]" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/80" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-[hsl(var(--green))]" />
          <span>Goal Met</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted ring-1 ring-primary" />
          <span>Today</span>
        </div>
      </div>
    </motion.div>
  );
};

export default StreakCalendar;
