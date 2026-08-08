import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, RotateCcw, ChevronRight, Star, Timer, Mic } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { fireFeedback } from "@/hooks/useFeedback";
import { useProgress } from "@/hooks/useProgress";

type Difficulty = "easy" | "medium" | "hard";

interface TongueTwister {
  text: string;
  difficulty: Difficulty;
  hint: string;
}

const tongueTwisters: TongueTwister[] = [
  // Easy
  { text: "She sells seashells by the seashore.", difficulty: "easy", hint: "Focus on the 'sh' and 's' sounds" },
  { text: "Red lorry, yellow lorry.", difficulty: "easy", hint: "Say each color clearly" },
  { text: "Toy boat, toy boat, toy boat.", difficulty: "easy", hint: "Keep the 'oy' sound consistent" },
  { text: "Fresh French fried fish.", difficulty: "easy", hint: "Mind the 'fr' and 'f' sounds" },
  { text: "Six sticky skeletons.", difficulty: "easy", hint: "Focus on the 'sk' and 'st' blends" },
  // Medium
  { text: "How much wood would a woodchuck chuck if a woodchuck could chuck wood?", difficulty: "medium", hint: "Rhythm is key — keep the beat steady" },
  { text: "Peter Piper picked a peck of pickled peppers.", difficulty: "medium", hint: "Pop each 'p' sound crisply" },
  { text: "Fuzzy Wuzzy was a bear. Fuzzy Wuzzy had no hair.", difficulty: "medium", hint: "Don't rush the 'z' sounds" },
  { text: "I scream, you scream, we all scream for ice cream!", difficulty: "medium", hint: "Watch 'scream' vs 'ice cream'" },
  { text: "Betty Botter bought some butter but the butter was bitter.", difficulty: "medium", hint: "Keep the 'b' and 't' sounds distinct" },
  // Hard
  { text: "The sixth sick sheik's sixth sheep's sick.", difficulty: "hard", hint: "This is one of the toughest — go slow!" },
  { text: "Pad kid poured curd pulled cod.", difficulty: "hard", hint: "Considered the hardest in the world — good luck!" },
  { text: "Brisk brave brigadiers brandished broad bright blades.", difficulty: "hard", hint: "Focus on the 'br' and 'bl' blends" },
  { text: "If a dog chews shoes, whose shoes does he choose?", difficulty: "hard", hint: "Watch the 'ch' and 'sh' sounds" },
  { text: "Six Czech cricket critics.", difficulty: "hard", hint: "Take it syllable by syllable" },
];

const difficultyConfig: Record<Difficulty, { label: string; color: string; xp: number }> = {
  easy: { label: "Easy", color: "bg-[hsl(var(--green))]", xp: 5 },
  medium: { label: "Medium", color: "bg-[hsl(var(--yellow))]", xp: 10 },
  hard: { label: "Hard", color: "bg-[hsl(var(--orange))]", xp: 20 },
};

const TongueTwisters = () => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { addXP } = useProgress();

  const filtered = tongueTwisters.filter(t => t.difficulty === difficulty);
  const current = filtered[currentIndex];

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speed;
    utter.lang = "en-US";
    setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [speed]);

  const handleComplete = () => {
    if (!current || completed.includes(currentIndex)) return;
    const xp = difficultyConfig[current.difficulty].xp;
    setScore(s => s + xp);
    setCompleted(c => [...c, currentIndex]);
    addXP(xp);
    fireFeedback("success");
  };

  const handleNext = () => {
    setShowHint(false);
    if (currentIndex < filtered.length - 1) {
      setCurrentIndex(i => i + 1);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setCompleted([]);
    setScore(0);
    setShowHint(false);
  };

  if (!difficulty) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Tongue Twisters" icon={<Mic className="w-5 h-5 text-primary" />} />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-muted-foreground"
          >
            Practice pronunciation with fun tongue twisters! Pick a difficulty:
          </motion.p>
          {(["easy", "medium", "hard"] as Difficulty[]).map((d, i) => (
            <motion.button
              key={d}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => { setDifficulty(d); setCurrentIndex(0); setCompleted([]); setScore(0); }}
              className="w-full bg-card rounded-2xl shadow-card p-5 flex items-center justify-between hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${difficultyConfig[d].color}`} />
                <span className="font-bold text-foreground text-lg">{difficultyConfig[d].label}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="w-4 h-4" />
                <span className="text-sm">{difficultyConfig[d].xp} XP each</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Tongue Twisters" icon={<Mic className="w-5 h-5 text-primary" />} showBack />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded-full text-xs font-bold text-primary-foreground ${difficultyConfig[difficulty].color}`}>
              {difficultyConfig[difficulty].label}
            </div>
            <span className="text-sm text-muted-foreground">{currentIndex + 1}/{filtered.length}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-foreground">
            <Star className="w-4 h-4 text-[hsl(var(--yellow))]" />
            {score} XP
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((completed.length) / filtered.length) * 100}%` }}
          />
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-card rounded-2xl shadow-card p-6 space-y-4"
            >
              <p className="text-xl font-bold text-foreground leading-relaxed text-center">
                "{current.text}"
              </p>

              {showHint && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-muted-foreground text-center bg-muted rounded-xl p-3"
                >
                  💡 {current.hint}
                </motion.p>
              )}

              {/* Speed control */}
              <div className="flex items-center justify-center gap-3">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Speed:</span>
                {[0.5, 0.75, 1].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      speed === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => speak(current.text)}
                  disabled={isSpeaking}
                >
                  <Volume2 className="w-4 h-4 mr-1" />
                  Listen
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowHint(!showHint)}
                >
                  {showHint ? "Hide Hint" : "Show Hint"}
                </Button>
              </div>

              <div className="flex gap-2">
                {completed.includes(currentIndex) ? (
                  <Button className="flex-1 opacity-60" disabled>
                    ✅ Completed
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={handleComplete}>
                    I said it! +{difficultyConfig[current.difficulty].xp} XP
                  </Button>
                )}
                {currentIndex < filtered.length - 1 && (
                  <Button variant="secondary" onClick={handleNext}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed all */}
        {completed.length === filtered.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl shadow-card p-6 text-center space-y-3"
          >
            <p className="text-4xl">🎉</p>
            <h3 className="text-lg font-bold text-foreground">All Done!</h3>
            <p className="text-muted-foreground">You earned {score} XP from this set!</p>
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="w-4 h-4 mr-1" /> Try Again
            </Button>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default TongueTwisters;
