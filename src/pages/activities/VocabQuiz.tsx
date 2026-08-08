import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { GraduationCap, Lock, Star, Trophy, CheckCircle, XCircle, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";
import { useUserId } from "@/hooks/useUserId";
import { supabase } from "@/integrations/supabase/client";
import { queuePendingScore } from "@/lib/offlineSync";
import {
  usePersonalization,
  recordMissedTopic,
  clearMissedTopic,
  levelIndex,
} from "@/hooks/usePersonalization";
import { saveResumeContext, clearResumeContext } from "@/hooks/useLastActivity";


interface QuizQuestion {
  word: string;
  meaning: string;
  options: string[];
  correctIndex: number;
}

const LEVELS: { name: string; minXP: number; words: QuizQuestion[] }[] = [
  {
    name: "Beginner",
    minXP: 0,
    words: [
      { word: "Happy", meaning: "Feeling joy", options: ["Feeling joy", "Feeling sad", "Feeling tired", "Feeling angry"], correctIndex: 0 },
      { word: "Big", meaning: "Large in size", options: ["Small in size", "Large in size", "Round in shape", "Flat"], correctIndex: 1 },
      { word: "Fast", meaning: "Moving quickly", options: ["Moving slowly", "Standing still", "Moving quickly", "Falling down"], correctIndex: 2 },
      { word: "Kind", meaning: "Being nice", options: ["Being mean", "Being loud", "Being quiet", "Being nice"], correctIndex: 3 },
      { word: "Brave", meaning: "Not afraid", options: ["Not afraid", "Very scared", "Very sleepy", "Very hungry"], correctIndex: 0 },
    ],
  },
  {
    name: "Elementary",
    minXP: 100,
    words: [
      { word: "Curious", meaning: "Eager to learn", options: ["Eager to learn", "Wanting to sleep", "Feeling bored", "Being rude"], correctIndex: 0 },
      { word: "Ancient", meaning: "Very old", options: ["Brand new", "Very old", "Very small", "Very loud"], correctIndex: 1 },
      { word: "Gentle", meaning: "Soft and calm", options: ["Harsh and loud", "Fast and wild", "Soft and calm", "Big and strong"], correctIndex: 2 },
      { word: "Journey", meaning: "A long trip", options: ["A quick nap", "A short run", "A big meal", "A long trip"], correctIndex: 3 },
      { word: "Discover", meaning: "To find something new", options: ["To find something new", "To lose something", "To break something", "To hide something"], correctIndex: 0 },
    ],
  },
  {
    name: "Intermediate",
    minXP: 300,
    words: [
      { word: "Determined", meaning: "Having a strong will", options: ["Having a strong will", "Being very lazy", "Being confused", "Being afraid"], correctIndex: 0 },
      { word: "Magnificent", meaning: "Extremely beautiful", options: ["Very ugly", "Extremely beautiful", "Quite boring", "Somewhat small"], correctIndex: 1 },
      { word: "Persevere", meaning: "To keep trying", options: ["To give up", "To run away", "To keep trying", "To start over"], correctIndex: 2 },
      { word: "Eloquent", meaning: "Speaking beautifully", options: ["Speaking quietly", "Speaking rudely", "Speaking quickly", "Speaking beautifully"], correctIndex: 3 },
      { word: "Resilient", meaning: "Bouncing back from hardship", options: ["Bouncing back from hardship", "Giving up easily", "Being fragile", "Being stubborn"], correctIndex: 0 },
    ],
  },
  {
    name: "Advanced",
    minXP: 600,
    words: [
      { word: "Ephemeral", meaning: "Lasting a very short time", options: ["Lasting a very short time", "Lasting forever", "Extremely large", "Very colorful"], correctIndex: 0 },
      { word: "Ubiquitous", meaning: "Found everywhere", options: ["Very rare", "Found everywhere", "Extremely small", "Very expensive"], correctIndex: 1 },
      { word: "Serendipity", meaning: "A happy accident", options: ["A sad event", "A planned meeting", "A happy accident", "A boring day"], correctIndex: 2 },
      { word: "Quintessential", meaning: "The perfect example", options: ["The worst example", "A rough draft", "A tiny piece", "The perfect example"], correctIndex: 3 },
      { word: "Benevolent", meaning: "Kind and generous", options: ["Kind and generous", "Mean and selfish", "Shy and quiet", "Loud and proud"], correctIndex: 0 },
    ],
  },
];

const VocabQuiz = () => {
  const { progress, addXP } = useProgress();
  const userId = useUserId();
  const [searchParams, setSearchParams] = useSearchParams();
  const { age, skillLevel, missedTopics, loading: personalizing } = usePersonalization();

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  const userXP = progress?.xp ?? 0;

  // Level suggested from the child's profile level, capped by unlocked XP.
  const suggestedLevel = useMemo(() => {
    let idx = levelIndex(skillLevel);
    if (age !== null && age <= 8) idx = Math.min(idx, 1);
    while (idx > 0 && userXP < LEVELS[idx].minXP) idx -= 1;
    return idx;
  }, [skillLevel, age, userXP]);

  // Questions for the chosen level, with previously missed words asked first.
  const questions = useMemo(() => {
    if (selectedLevel === null) return [];
    const missed = new Set(missedTopics.map((m) => m.topic.toLowerCase()));
    const words = [...LEVELS[selectedLevel].words];
    words.sort((a, b) => {
      const am = missed.has(a.word.toLowerCase()) ? 1 : 0;
      const bm = missed.has(b.word.toLowerCase()) ? 1 : 0;
      return bm - am;
    });
    return words;
  }, [selectedLevel, missedTopics]);

  const reviewCount = useMemo(() => {
    const missed = new Set(missedTopics.map((m) => m.topic.toLowerCase()));
    return questions.filter((q) => missed.has(q.word.toLowerCase())).length;
  }, [questions, missedTopics]);

  // ── Deep-link resume: /activity/vocab-quiz?level=1&q=3 ──
  useEffect(() => {
    if (selectedLevel !== null || personalizing) return;
    const lvl = Number(searchParams.get("level"));
    if (!Number.isNaN(lvl) && searchParams.get("level") !== null && LEVELS[lvl]) {
      if (userXP >= LEVELS[lvl].minXP) {
        setSelectedLevel(lvl);
        const q = Number(searchParams.get("q") ?? 0);
        setCurrentQ(Number.isFinite(q) && q > 0 ? Math.min(q, LEVELS[lvl].words.length - 1) : 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalizing]);

  // ── Persist resume context so /learn deep links reopen this exact spot ──
  useEffect(() => {
    if (selectedLevel === null || quizComplete) return;
    saveResumeContext("/activity/vocab-quiz", { level: selectedLevel, q: currentQ });
    setSearchParams(
      { level: String(selectedLevel), q: String(currentQ) },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLevel, currentQ, quizComplete]);

  const handleAnswer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    const question = questions[currentQ];
    if (index === question.correctIndex) {
      setScore((s) => s + 1);
      clearMissedTopic(userId, question.word, "vocab-quiz");
    } else {
      // Remember the weak word (and the skill) to personalise future sessions.
      recordMissedTopic(userId, question.word, "vocab-quiz");
      recordMissedTopic(userId, "vocabulary", "skill");
    }
    setTimeout(() => {
      setShowResult(true);
    }, 600);
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setQuizComplete(true);
      clearResumeContext("/activity/vocab-quiz");
      const earned = score * 10;
      if (earned > 0) addXP(earned);
      // Save score
      if (userId) {
        supabase
          .from("game_scores")
          .insert({ user_id: userId, game_type: `vocab_level_${selectedLevel}`, score, max_score: questions.length })
          .then(({ error }) => {
            if (error) queuePendingScore(userId, `vocab_level_${selectedLevel}`, score, questions.length);
          });
      }
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const resetQuiz = () => {
    setSelectedLevel(null);
    setCurrentQ(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
    setQuizComplete(false);
    clearResumeContext("/activity/vocab-quiz");
    setSearchParams({}, { replace: true });
  };


  // Level selector
  if (selectedLevel === null) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Vocabulary Quiz" showBack icon={<GraduationCap className="w-5 h-5 text-primary" />} />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">Choose a level to start! Earn XP to unlock harder levels.</p>
          {!personalizing && (
            <div className="flex items-start gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
              <Sparkles className="w-4 h-4 text-primary mt-0.5" aria-hidden="true" />
              <p className="text-xs text-foreground">
                Recommended for you: <span className="font-bold">{LEVELS[suggestedLevel].name}</span>
                {age ? ` · age ${age}` : ""}
                {missedTopics.length > 0 ? " · we'll revisit words you missed first" : ""}
              </p>
            </div>
          )}
          {LEVELS.map((level, i) => {
            const locked = userXP < level.minXP;
            const recommended = i === suggestedLevel && !locked;

            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                disabled={locked}
                onClick={() => setSelectedLevel(i)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  locked
                    ? "bg-muted border-border opacity-60 cursor-not-allowed"
                    : recommended
                      ? "bg-card border-primary shadow-card-hover cursor-pointer"
                      : "bg-card border-border hover:border-primary hover:shadow-card-hover cursor-pointer"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${locked ? "bg-muted" : "bg-primary/10"}`}>
                  {locked ? <Lock className="w-5 h-5 text-muted-foreground" /> : <Star className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-foreground">
                    {level.name}
                    {recommended && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary align-middle">
                        For you
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locked ? `Unlock at ${level.minXP} XP` : `${level.words.length} questions`}
                  </p>
                </div>
                {!locked && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  const level = LEVELS[selectedLevel];
  const question = questions[currentQ];
  if (!question && !quizComplete) return null;


  // Quiz complete
  if (quizComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-4">
          <Trophy className="w-16 h-16 text-yellow mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Quiz Complete!</h2>
          <p className="text-lg text-muted-foreground">
            You got <span className="text-primary font-bold">{score}/{questions.length}</span> correct
          </p>
          <p className="text-sm text-yellow font-semibold">+{score * 10} XP earned!</p>
          <Button onClick={resetQuiz} className="mt-4">Back to Levels</Button>
        </motion.div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={`${level.name} Quiz`} showBack icon={<GraduationCap className="w-5 h-5 text-primary" />} />

      {/* Progress bar */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Question {currentQ + 1}/{questions.length}</span>
          <span>Score: {score}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentQ} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-2">What does this word mean?</p>
              <h2 className="text-3xl font-bold text-foreground">{question.word}</h2>
            </div>

            <div className="space-y-3">
              {question.options.map((option, i) => {
                const isCorrect = i === question.correctIndex;
                const isSelected = selected === i;
                let borderClass = "border-border";
                if (selected !== null) {
                  if (isCorrect) borderClass = "border-green bg-green-light";
                  else if (isSelected) borderClass = "border-destructive bg-destructive/10";
                }

                return (
                  <motion.button
                    key={i}
                    whileTap={selected === null ? { scale: 0.97 } : {}}
                    onClick={() => handleAnswer(i)}
                    disabled={selected !== null}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${borderClass} ${
                      selected === null ? "hover:border-primary bg-card" : ""
                    }`}
                  >
                    <span className="flex-1 font-medium text-foreground">{option}</span>
                    {selected !== null && isCorrect && <CheckCircle className="w-5 h-5 text-green" />}
                    {selected !== null && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                  </motion.button>
                );
              })}
            </div>

            {showResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
                <Button onClick={nextQuestion} className="gap-2">
                  {currentQ + 1 >= questions.length ? "See Results" : "Next Question"} <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VocabQuiz;
