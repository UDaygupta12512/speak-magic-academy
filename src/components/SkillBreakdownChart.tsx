import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useUserId";
import { useAppLanguage, type AppLanguage } from "@/hooks/useAppLanguage";

type Skill = "pronunciation" | "grammar";

const SKILL_ACTIVITIES: Record<Skill, string[]> = {
  pronunciation: ["pronunciation", "phonics", "tongue_twisters", "spelling_bee", "ai_call", "practice_chat"],
  grammar: ["grammar", "sentence_builder", "writing", "reading_comprehension", "vocab_quiz", "word_meaning"],
};

const ACTIVITY_LABELS: Record<AppLanguage, Record<string, string>> = {
  en: {
    pronunciation: "Pronunciation",
    phonics: "Phonics",
    tongue_twisters: "Tongue Twisters",
    spelling_bee: "Spelling Bee",
    ai_call: "AI Call",
    practice_chat: "Practice Chat",
    grammar: "Grammar",
    sentence_builder: "Sentences",
    writing: "Writing",
    reading_comprehension: "Reading",
    vocab_quiz: "Vocab Quiz",
    word_meaning: "Word Meaning",
  },
  hi: {
    pronunciation: "उच्चारण",
    phonics: "फ़ोनिक्स",
    tongue_twisters: "जीभ-तोड़",
    spelling_bee: "स्पेलिंग बी",
    ai_call: "AI कॉल",
    practice_chat: "प्रैक्टिस चैट",
    grammar: "व्याकरण",
    sentence_builder: "वाक्य",
    writing: "लेखन",
    reading_comprehension: "पठन",
    vocab_quiz: "शब्द क्विज़",
    word_meaning: "शब्दार्थ",
  },
};

const COPY: Record<AppLanguage, {
  title: string;
  subtitle: string;
  pronunciation: string;
  grammar: string;
  empty: string;
  minutes: string;
  totalThisWeek: (m: number) => string;
}> = {
  en: {
    title: "Weekly Breakdown by Activity",
    subtitle: "How your weekly minutes break down for each skill goal.",
    pronunciation: "Pronunciation",
    grammar: "Grammar",
    empty: "No minutes logged yet this week.",
    minutes: "min",
    totalThisWeek: (m) => `${m} min total this week`,
  },
  hi: {
    title: "गतिविधि अनुसार साप्ताहिक विश्लेषण",
    subtitle: "हर लक्ष्य में आपके साप्ताहिक मिनट कैसे बँटे हैं।",
    pronunciation: "उच्चारण",
    grammar: "व्याकरण",
    empty: "इस सप्ताह कोई मिनट दर्ज नहीं हुए।",
    minutes: "मिनट",
    totalThisWeek: (m) => `इस सप्ताह कुल ${m} मिनट`,
  },
};

const COLORS: Record<Skill, string> = {
  pronunciation: "hsl(var(--primary))",
  grammar: "hsl(var(--green))",
};

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

interface Row {
  key: string;
  label: string;
  minutes: number;
  skill: Skill;
}

const SkillBreakdownChart = () => {
  const userId = useUserId();
  const [appLang] = useAppLanguage();
  const [data, setData] = useState<Record<Skill, Row[]>>({ pronunciation: [], grammar: [] });
  const t = COPY[appLang];

  const load = useCallback(async () => {
    if (!userId) return;
    const since = startOfWeek().toISOString();
    const { data: rows, error } = await supabase
      .from("activity_sessions")
      .select("activity_type,duration_seconds")
      .eq("user_id", userId)
      .gte("created_at", since);
    if (error) return;

    const buckets: Record<Skill, Map<string, number>> = {
      pronunciation: new Map(),
      grammar: new Map(),
    };
    (rows ?? []).forEach((r: any) => {
      const secs = r.duration_seconds ?? 0;
      (Object.keys(SKILL_ACTIVITIES) as Skill[]).forEach((s) => {
        if (SKILL_ACTIVITIES[s].includes(r.activity_type)) {
          buckets[s].set(r.activity_type, (buckets[s].get(r.activity_type) ?? 0) + secs);
        }
      });
    });
    const labels = ACTIVITY_LABELS[appLang];
    const toRows = (s: Skill): Row[] =>
      Array.from(buckets[s], ([key, secs]) => ({
        key,
        label: labels[key] ?? key,
        minutes: Math.round(secs / 60),
        skill: s,
      }))
        .filter((r) => r.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes);

    setData({ pronunciation: toRows("pronunciation"), grammar: toRows("grammar") });
  }, [userId, appLang]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`skill-breakdown-${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "activity_sessions",
        filter: `user_id=eq.${userId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const totals = useMemo(() => ({
    pronunciation: data.pronunciation.reduce((s, r) => s + r.minutes, 0),
    grammar: data.grammar.reduce((s, r) => s + r.minutes, 0),
  }), [data]);

  const Section = ({ skill, label }: { skill: Skill; label: string }) => {
    const rows = data[skill];
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-foreground">{label}</h3>
          <span className="text-[11px] text-muted-foreground">{t.totalThisWeek(totals[skill])}</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t.empty}</p>
        ) : (
          <div style={{ height: Math.max(120, rows.length * 32) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={96}
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} ${t.minutes}`, label]}
                />
                <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill={COLORS[skill]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.section
      key={appLang}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-card rounded-2xl shadow-card p-4 space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-foreground">{t.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>
      </div>
      <Section skill="pronunciation" label={t.pronunciation} />
      <Section skill="grammar" label={t.grammar} />
    </motion.section>
  );
};

export default SkillBreakdownChart;
