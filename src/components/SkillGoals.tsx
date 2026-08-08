import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Mic, BookOpenCheck, Target, CheckCircle2, Volume2, VolumeX, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAppLanguage, type AppLanguage } from "@/hooks/useAppLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useUserId";
import SkillBreakdownChart from "@/components/SkillBreakdownChart";

type Skill = "pronunciation" | "grammar";
type SoundChoice = "chime" | "bell" | "soft" | "silent";

interface SkillGoal {
  weeklyMinutes: number;
  reminderDay: number;
  reminderHour: number;
  remindersOn: boolean;
  sound: SoundChoice;
}

interface GoalsState {
  pronunciation: SkillGoal;
  grammar: SkillGoal;
  lastNotifiedISO?: Record<Skill, string | undefined>;
}

const STORAGE_KEY = "speakgenie:skill-goals";
const DEFAULTS: GoalsState = {
  pronunciation: { weeklyMinutes: 30, reminderDay: 1, reminderHour: 18, remindersOn: true, sound: "chime" },
  grammar: { weeklyMinutes: 30, reminderDay: 3, reminderHour: 18, remindersOn: true, sound: "bell" },
  lastNotifiedISO: { pronunciation: undefined, grammar: undefined },
};

// Activity types that count toward each skill goal
const SKILL_ACTIVITIES: Record<Skill, string[]> = {
  pronunciation: ["pronunciation", "phonics", "tongue_twisters", "spelling_bee", "ai_call", "practice_chat"],
  grammar: ["grammar", "sentence_builder", "writing", "reading_comprehension", "vocab_quiz", "word_meaning"],
};

const COPY: Record<AppLanguage, {
  title: string;
  subtitle: string;
  pronunciation: string;
  grammar: string;
  weekly: (m: number) => string;
  reminderOn: string;
  reminderOff: string;
  enable: string;
  disable: string;
  save: string;
  saved: string;
  reminderTitle: (s: string) => string;
  reminderBody: (s: string, m: number) => string;
  permissionDenied: string;
  day: string;
  time: string;
  sound: string;
  sounds: Record<SoundChoice, string>;
  preview: string;
  days: string[];
  skillNames: Record<Skill, string>;
  weekProgress: string;
  minsThisWeek: (done: number, target: number) => string;
  goalReached: string;
  liveUpdate: string;
}> = {
  en: {
    title: "Skill Goals & Weekly Tracker",
    subtitle: "Set targets, choose reminder sounds, and watch your weekly minutes update live.",
    pronunciation: "Pronunciation",
    grammar: "Grammar",
    weekly: (m) => `${m} min / week`,
    reminderOn: "Weekly reminder is on",
    reminderOff: "Weekly reminder is off",
    enable: "Enable reminders",
    disable: "Turn off",
    save: "Save goal",
    saved: "Goal saved!",
    reminderTitle: (s) => `Time to practice ${s} 🎯`,
    reminderBody: (s, m) => `Your weekly ${s} goal is ${m} minutes. Let's go!`,
    permissionDenied: "Browser notifications were blocked. Enable them in site settings to get reminders.",
    day: "Day",
    time: "Hour",
    sound: "Sound",
    sounds: { chime: "🔔 Chime", bell: "🛎 Bell", soft: "🎵 Soft", silent: "🔕 Silent" },
    preview: "Preview",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    skillNames: { pronunciation: "pronunciation", grammar: "grammar" },
    weekProgress: "This week's progress",
    minsThisWeek: (d, t) => `${d} / ${t} min completed`,
    goalReached: "Weekly goal reached! 🎉",
    liveUpdate: "Live · auto-updates as you practice",
  },
  hi: {
    title: "लक्ष्य और साप्ताहिक प्रगति",
    subtitle: "लक्ष्य सेट करें, रिमाइंडर साउंड चुनें और हर हफ्ते अपनी प्रगति लाइव देखें।",
    pronunciation: "उच्चारण",
    grammar: "व्याकरण",
    weekly: (m) => `${m} मिनट / सप्ताह`,
    reminderOn: "साप्ताहिक रिमाइंडर चालू है",
    reminderOff: "साप्ताहिक रिमाइंडर बंद है",
    enable: "रिमाइंडर चालू करें",
    disable: "बंद करें",
    save: "लक्ष्य सहेजें",
    saved: "लक्ष्य सहेजा गया!",
    reminderTitle: (s) => `${s} का अभ्यास करने का समय 🎯`,
    reminderBody: (s, m) => `इस सप्ताह ${s} का लक्ष्य ${m} मिनट है। चलिए शुरू करें!`,
    permissionDenied: "ब्राउज़र नोटिफिकेशन ब्लॉक हैं। साइट सेटिंग्स में चालू करें।",
    day: "दिन",
    time: "समय",
    sound: "ध्वनि",
    sounds: { chime: "🔔 चाइम", bell: "🛎 घंटी", soft: "🎵 कोमल", silent: "🔕 मौन" },
    preview: "सुनें",
    days: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
    skillNames: { pronunciation: "उच्चारण", grammar: "व्याकरण" },
    weekProgress: "इस सप्ताह की प्रगति",
    minsThisWeek: (d, t) => `${d} / ${t} मिनट पूरे`,
    goalReached: "साप्ताहिक लक्ष्य पूरा! 🎉",
    liveUpdate: "लाइव · अभ्यास करते ही अपडेट होगा",
  },
};

const loadGoals = (): GoalsState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      pronunciation: { ...DEFAULTS.pronunciation, ...(parsed.pronunciation ?? {}) },
      grammar: { ...DEFAULTS.grammar, ...(parsed.grammar ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
};

const saveGoals = (g: GoalsState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch { /* noop */ }
};

const isoWeek = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
};

// Start of current week (Sunday 00:00 local)
const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

// ── Sound engine ──────────────────────────────────────────
let _ctx: AudioContext | null = null;
const getCtx = () => {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
};

const SOUND_PATTERNS: Record<SoundChoice, Array<{ f: number; d: number; t?: OscillatorType; delay?: number }>> = {
  chime: [{ f: 880, d: 0.18, t: "sine" }, { f: 1320, d: 0.22, t: "sine", delay: 0.15 }],
  bell:  [{ f: 660, d: 0.35, t: "triangle" }, { f: 990, d: 0.25, t: "triangle", delay: 0.05 }],
  soft:  [{ f: 523, d: 0.4, t: "sine" }, { f: 784, d: 0.4, t: "sine", delay: 0.2 }],
  silent: [],
};

const playReminderSound = (choice: SoundChoice) => {
  if (choice === "silent") return;
  try {
    const ctx = getCtx();
    SOUND_PATTERNS[choice].forEach(({ f, d, t = "sine", delay = 0 }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = t;
      osc.frequency.value = f;
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + d + 0.05);
    });
  } catch { /* noop */ }
};

const SkillGoals = () => {
  const [appLang] = useAppLanguage();
  const { toast } = useToast();
  const userId = useUserId();
  const [goals, setGoals] = useState<GoalsState>(loadGoals);
  const [weeklyMins, setWeeklyMins] = useState<Record<Skill, number>>({ pronunciation: 0, grammar: 0 });
  const t = COPY[appLang];

  // ── Load weekly minutes from activity_sessions ──────────
  const loadWeekly = useCallback(async () => {
    if (!userId) return;
    try {
      const since = startOfWeek().toISOString();
      const { data, error } = await supabase
        .from("activity_sessions")
        .select("activity_type,duration_seconds")
        .eq("user_id", userId)
        .gte("created_at", since);
      if (error) throw error;
      const totals: Record<Skill, number> = { pronunciation: 0, grammar: 0 };
      (data ?? []).forEach((row: any) => {
        const secs = row.duration_seconds ?? 0;
        (Object.keys(SKILL_ACTIVITIES) as Skill[]).forEach((skill) => {
          if (SKILL_ACTIVITIES[skill].includes(row.activity_type)) {
            totals[skill] += secs;
          }
        });
      });
      setWeeklyMins({
        pronunciation: Math.round(totals.pronunciation / 60),
        grammar: Math.round(totals.grammar / 60),
      });
    } catch (e) {
      console.error("[SkillGoals] weekly load failed", e);
    }
  }, [userId]);

  useEffect(() => { loadWeekly(); }, [loadWeekly]);

  // ── Realtime: refresh whenever a new session is inserted
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`skill-goals-${userId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_sessions",
        filter: `user_id=eq.${userId}`,
      }, () => loadWeekly())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadWeekly]);

  // Periodic refresh as a safety net (every 30s)
  useEffect(() => {
    const id = window.setInterval(loadWeekly, 30_000);
    return () => window.clearInterval(id);
  }, [loadWeekly]);

  // ── Reminder check ──────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const weekKey = isoWeek(now);
      (["pronunciation", "grammar"] as Skill[]).forEach((skill) => {
        const g = goals[skill];
        if (!g.remindersOn) return;
        const due = now.getDay() === g.reminderDay && now.getHours() >= g.reminderHour;
        if (!due) return;
        const last = goals.lastNotifiedISO?.[skill];
        if (last === weekKey) return;

        const skillName = t.skillNames[skill];
        const title = t.reminderTitle(skillName);
        const body = t.reminderBody(skillName, g.weeklyMinutes);

        playReminderSound(g.sound);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification(title, { body, lang: appLang, silent: g.sound === "silent" }); }
          catch { toast({ title, description: body }); }
        } else {
          toast({ title, description: body });
        }

        setGoals((prev) => {
          const next: GoalsState = {
            ...prev,
            lastNotifiedISO: { ...(prev.lastNotifiedISO ?? {}), [skill]: weekKey } as GoalsState["lastNotifiedISO"],
          };
          saveGoals(next);
          return next;
        });
      });
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [goals, appLang, t, toast]);

  const requestPermission = async (skill: Skill, on: boolean) => {
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result === "denied") toast({ title: t.permissionDenied });
    }
    update(skill, { remindersOn: on });
  };

  const update = (skill: Skill, patch: Partial<SkillGoal>) => {
    setGoals((prev) => {
      const next: GoalsState = { ...prev, [skill]: { ...prev[skill], ...patch } };
      saveGoals(next);
      return next;
    });
  };

  const SkillCard = ({ skill, icon: Icon, label, accent }: { skill: Skill; icon: typeof Mic; label: string; accent: string }) => {
    const g = goals[skill];
    const done = weeklyMins[skill];
    const pct = Math.min(100, Math.round((done / Math.max(1, g.weeklyMinutes)) * 100));
    const reached = done >= g.weeklyMinutes;

    return (
      <div className="bg-card rounded-2xl shadow-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">{label}</h3>
            <p className="text-sm text-muted-foreground">{t.weekly(g.weeklyMinutes)}</p>
          </div>
        </div>

        {/* Weekly progress tracker */}
        <div className="bg-muted/40 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold flex items-center gap-1 text-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              {t.weekProgress}
            </span>
            <span className="text-muted-foreground">{t.minsThisWeek(done, g.weeklyMinutes)}</span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-[11px] mt-1.5 text-muted-foreground">
            {reached ? t.goalReached : t.liveUpdate}
          </p>
        </div>

        <div className="space-y-4">
          <Slider
            value={[g.weeklyMinutes]}
            min={10} max={180} step={5}
            onValueChange={(v) => update(skill, { weeklyMinutes: v[0] })}
          />

          <div className="grid grid-cols-3 gap-2 text-xs">
            <label className="block">
              <span className="text-muted-foreground">{t.day}</span>
              <select
                value={g.reminderDay}
                onChange={(e) => update(skill, { reminderDay: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
              >
                {t.days.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground">{t.time}</span>
              <select
                value={g.reminderHour}
                onChange={(e) => update(skill, { reminderHour: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted-foreground">{t.sound}</span>
              <select
                value={g.sound}
                onChange={(e) => update(skill, { sound: e.target.value as SoundChoice })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
              >
                {(Object.keys(t.sounds) as SoundChoice[]).map((s) => (
                  <option key={s} value={s}>{t.sounds[s]}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              {g.remindersOn ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              <span className="text-muted-foreground">{g.remindersOn ? t.reminderOn : t.reminderOff}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => playReminderSound(g.sound)}
                className="rounded-xl"
                disabled={g.sound === "silent"}
                aria-label={t.preview}
              >
                {g.sound === "silent" ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant={g.remindersOn ? "outline" : "default"}
                onClick={() => requestPermission(skill, !g.remindersOn)}
                className="rounded-xl"
              >
                {g.remindersOn ? t.disable : t.enable}
              </Button>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => {
              saveGoals(goals);
              toast({ title: t.saved, description: `${label} • ${t.weekly(g.weeklyMinutes)}` });
            }}
            className="w-full rounded-xl"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {t.save}
          </Button>
        </div>
      </div>
    );
  };

  const header = useMemo(() => (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Target className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h2 className="font-bold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>
    </div>
  ), [t]);

  return (
    <motion.section
      key={appLang}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <div className="bg-card rounded-2xl shadow-card p-4">{header}</div>
      <SkillCard skill="pronunciation" icon={Mic} label={t.pronunciation} accent="bg-[hsl(var(--primary))]" />
      <SkillCard skill="grammar" icon={BookOpenCheck} label={t.grammar} accent="bg-[hsl(var(--green))]" />
      <SkillBreakdownChart />
    </motion.section>
  );
};

export default SkillGoals;
