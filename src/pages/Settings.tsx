import { BarChart3, Bell, ChevronRight, Flame, Languages, Moon, Shield, Sparkles, Trophy, Volume2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { useProgress } from "@/hooks/useProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import SkillGoals from "@/components/SkillGoals";

const settings = [
  { icon: Volume2, title: "Sound Effects", detail: "Use the Profile toggle to turn app sounds on or off." },
  { icon: Moon, title: "Dark Mode", detail: "Switch between light and dark mode from your Profile." },
  { icon: Bell, title: "Learning Reminders", detail: "Daily practice reminders are ready for parent setup." },
  { icon: Shield, title: "Child Safety", detail: "SpeakGenie keeps practice focused on kid-friendly English learning." },
];

const Settings = () => {
  const navigate = useNavigate();
  const { progress, loading } = useProgress();
  const [appLang, setAppLang] = useAppLanguage();

  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const streak = progress?.streak_days ?? 0;
  const coins = progress?.coins ?? 0;
  const xpThisLevel = xp % 500;
  const xpToNextLevel = 500 - xpThisLevel;

  return (
    <div className="min-h-screen bg-background pb-6">
      <PageHeader title="Settings" showBack />
      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {/* Instant Report */}
        <section className="bg-gradient-to-br from-primary to-turquoise rounded-2xl shadow-card p-4 text-primary-foreground">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-bold text-lg">Instant Report</h2>
          </div>

          {loading ? (
            <Skeleton className="h-24 w-full bg-white/20" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                  <Trophy className="w-4 h-4 mx-auto mb-1 opacity-90" />
                  <p className="text-lg font-bold leading-none">{level}</p>
                  <p className="text-[10px] opacity-90 mt-1">Level</p>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                  <Zap className="w-4 h-4 mx-auto mb-1 opacity-90" />
                  <p className="text-lg font-bold leading-none">{xp.toLocaleString()}</p>
                  <p className="text-[10px] opacity-90 mt-1">Total XP</p>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
                  <Flame className="w-4 h-4 mx-auto mb-1 opacity-90" />
                  <p className="text-lg font-bold leading-none">{streak}</p>
                  <p className="text-[10px] opacity-90 mt-1">Day Streak</p>
                </div>
              </div>

              <div className="bg-white/15 backdrop-blur rounded-xl p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold">Level {level} progress</span>
                  <span className="opacity-90">{xpToNextLevel} XP to go</span>
                </div>
                <Progress value={(xpThisLevel / 500) * 100} className="h-2 bg-white/25" />
                <p className="text-[11px] opacity-90 mt-2">🪙 {coins} coins available to spend in the Rewards Shop.</p>
              </div>
            </>
          )}
        </section>

        <button
          type="button"
          onClick={() => navigate("/parent")}
          className="w-full bg-card rounded-2xl shadow-card p-4 flex gap-3 text-left items-center hover:shadow-card-hover transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-green-light text-green flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-foreground">Full Student Report</h2>
            <p className="text-sm text-muted-foreground mt-1">View XP, streaks, activities, audio stories, and progress history.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <section className="bg-card rounded-2xl shadow-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Languages className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-foreground">App Language</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Practice Chat, AI Call & Comic Book will open in this language.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => setAppLang("en")}
              variant={appLang === "en" ? "default" : "outline"}
              className={`rounded-xl ${appLang === "en" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
            >
              🇬🇧 English
            </Button>
            <Button
              type="button"
              onClick={() => setAppLang("hi")}
              variant={appLang === "hi" ? "default" : "outline"}
              className={`rounded-xl ${appLang === "hi" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
            >
              🇮🇳 हिंदी
            </Button>
          </div>
        </section>

        <SkillGoals />

        {settings.map((item) => (
          <section key={item.title} className="bg-card rounded-2xl shadow-card p-4 flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{item.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default Settings;
