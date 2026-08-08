import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange, CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppLanguage, type AppLanguage } from "@/hooks/useAppLanguage";

interface Props {
  userId: string | null;
  childName?: string;
}

const STORAGE_KEY = "speakgenie:parent-weekly-goal";

interface GoalShape {
  weeklyMinutes: number;
  weeklyXp: number;
}
const DEFAULTS: GoalShape = { weeklyMinutes: 90, weeklyXp: 300 };

const COPY: Record<AppLanguage, {
  title: string;
  subtitle: (name: string) => string;
  minutesGoal: string;
  xpGoal: string;
  progressTitle: string;
  minsThisWeek: (d: number, t: number) => string;
  xpThisWeek: (d: number, t: number) => string;
  reached: string;
  inProgress: string;
  save: string;
  saved: string;
  weeklyMins: (m: number) => string;
  weeklyXp: (x: number) => string;
}> = {
  en: {
    title: "Weekly Learning Goal",
    subtitle: (n) => `Set a weekly target for ${n}. Progress updates as they practice.`,
    minutesGoal: "Minutes per week",
    xpGoal: "XP per week",
    progressTitle: "This week's progress",
    minsThisWeek: (d, t) => `${d} / ${t} min`,
    xpThisWeek: (d, t) => `${d} / ${t} XP`,
    reached: "🎉 Weekly goal reached!",
    inProgress: "Keep going — updates live.",
    save: "Save weekly goal",
    saved: "Weekly goal saved!",
    weeklyMins: (m) => `${m} min / week`,
    weeklyXp: (x) => `${x} XP / week`,
  },
  hi: {
    title: "साप्ताहिक सीखने का लक्ष्य",
    subtitle: (n) => `${n} के लिए साप्ताहिक लक्ष्य सेट करें। अभ्यास के साथ प्रगति अपडेट होगी।`,
    minutesGoal: "मिनट प्रति सप्ताह",
    xpGoal: "XP प्रति सप्ताह",
    progressTitle: "इस सप्ताह की प्रगति",
    minsThisWeek: (d, t) => `${d} / ${t} मिनट`,
    xpThisWeek: (d, t) => `${d} / ${t} XP`,
    reached: "🎉 साप्ताहिक लक्ष्य पूरा!",
    inProgress: "जारी रखें — लाइव अपडेट हो रहा है।",
    save: "लक्ष्य सहेजें",
    saved: "साप्ताहिक लक्ष्य सहेजा गया!",
    weeklyMins: (m) => `${m} मिनट / सप्ताह`,
    weeklyXp: (x) => `${x} XP / सप्ताह`,
  },
};

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const loadGoal = (): GoalShape => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return { ...DEFAULTS, ...p };
  } catch {
    return DEFAULTS;
  }
};

const ParentWeeklyGoal = ({ userId, childName = "your child" }: Props) => {
  const [appLang] = useAppLanguage();
  const t = COPY[appLang];
  const { toast } = useToast();
  const [goal, setGoal] = useState<GoalShape>(loadGoal);
  const [weekly, setWeekly] = useState<{ minutes: number; xp: number }>({ minutes: 0, xp: 0 });

  const load = useCallback(async () => {
    if (!userId) return;
    const since = startOfWeek().toISOString();
    const { data, error } = await supabase
      .from("activity_sessions")
      .select("duration_seconds,xp_earned")
      .eq("user_id", userId)
      .gte("created_at", since);
    if (error) return;
    let secs = 0;
    let xp = 0;
    (data ?? []).forEach((r: any) => {
      secs += r.duration_seconds ?? 0;
      xp += r.xp_earned ?? 0;
    });
    setWeekly({ minutes: Math.round(secs / 60), xp });
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`parent-weekly-${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "activity_sessions",
        filter: `user_id=eq.${userId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(goal)); } catch { /* noop */ }
    toast({ title: t.saved });
  };

  const minPct = useMemo(
    () => Math.min(100, Math.round((weekly.minutes / Math.max(1, goal.weeklyMinutes)) * 100)),
    [weekly.minutes, goal.weeklyMinutes],
  );
  const xpPct = useMemo(
    () => Math.min(100, Math.round((weekly.xp / Math.max(1, goal.weeklyXp)) * 100)),
    [weekly.xp, goal.weeklyXp],
  );
  const reached = minPct >= 100 && xpPct >= 100;

  return (
    <motion.div
      key={appLang}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-card rounded-2xl shadow-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <CalendarRange className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">{t.title}</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">{t.subtitle(childName)}</p>

      {/* Progress */}
      <div className="bg-muted/40 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="w-4 h-4 text-primary" />
          {t.progressTitle}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t.minutesGoal}</span>
            <span className="font-semibold text-foreground">{t.minsThisWeek(weekly.minutes, goal.weeklyMinutes)}</span>
          </div>
          <Progress value={minPct} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{t.xpGoal}</span>
            <span className="font-semibold text-foreground">{t.xpThisWeek(weekly.xp, goal.weeklyXp)}</span>
          </div>
          <Progress value={xpPct} className="h-2" />
        </div>

        <p className="text-[11px] text-muted-foreground">{reached ? t.reached : t.inProgress}</p>
      </div>

      {/* Goal sliders */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">{t.minutesGoal}</span>
            <span className="font-semibold text-foreground">{t.weeklyMins(goal.weeklyMinutes)}</span>
          </div>
          <Slider
            value={[goal.weeklyMinutes]}
            min={30} max={420} step={15}
            onValueChange={(v) => setGoal((g) => ({ ...g, weeklyMinutes: v[0] }))}
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">{t.xpGoal}</span>
            <span className="font-semibold text-foreground">{t.weeklyXp(goal.weeklyXp)}</span>
          </div>
          <Slider
            value={[goal.weeklyXp]}
            min={50} max={1500} step={50}
            onValueChange={(v) => setGoal((g) => ({ ...g, weeklyXp: v[0] }))}
          />
        </div>
        <Button onClick={save} className="w-full rounded-xl">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {t.save}
        </Button>
      </div>
    </motion.div>
  );
};

export default ParentWeeklyGoal;
