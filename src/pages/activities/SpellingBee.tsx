import { useState, useEffect } from "react";
import { ArrowLeft, Volume2, Trophy, Star, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTextToSpeech } from "@/hooks/useVoice";
import { useProgress } from "@/hooks/useProgress";
import { queuePendingScore } from "@/lib/offlineSync";
import { useUserId } from "@/hooks/useUserId";
import BottomNav from "@/components/BottomNav";

interface BeeWord {
  word: string;
  hint: string;
  sentence: string;
  difficulty: "easy" | "medium" | "hard";
}

const wordBank: BeeWord[] = [
  { word: "apple", hint: "A red or green fruit", sentence: "I ate a juicy apple for lunch.", difficulty: "easy" },
  { word: "happy", hint: "Feeling joy", sentence: "The dog was happy to see its owner.", difficulty: "easy" },
  { word: "house", hint: "A place where people live", sentence: "We painted our house blue.", difficulty: "easy" },
  { word: "school", hint: "A place for learning", sentence: "I walk to school every morning.", difficulty: "easy" },
  { word: "friend", hint: "Someone you like spending time with", sentence: "My best friend lives next door.", difficulty: "easy" },
  { word: "beautiful", hint: "Very pretty to look at", sentence: "The sunset was beautiful tonight.", difficulty: "medium" },
  { word: "because", hint: "Gives a reason", sentence: "I stayed home because it was raining.", difficulty: "medium" },
  { word: "together", hint: "With each other", sentence: "We played together at the park.", difficulty: "medium" },
  { word: "different", hint: "Not the same", sentence: "Every snowflake is different.", difficulty: "medium" },
  { word: "important", hint: "Something that matters a lot", sentence: "Drinking water is important for health.", difficulty: "medium" },
  { word: "knowledge", hint: "What you gain from learning", sentence: "Reading books gives you knowledge.", difficulty: "hard" },
  { word: "necessary", hint: "Something you must have", sentence: "Sleep is necessary for good health.", difficulty: "hard" },
  { word: "adventure", hint: "An exciting experience", sentence: "The explorers went on a great adventure.", difficulty: "hard" },
  { word: "mysterious", hint: "Strange and hard to explain", sentence: "There was a mysterious sound in the attic.", difficulty: "hard" },
  { word: "environment", hint: "The world around us", sentence: "We should protect our environment.", difficulty: "hard" },
];

const ROUNDS = 8;

const SpellingBee = () => {
  const navigate = useNavigate();
  const { speak, isSpeaking } = useTextToSpeech({ rate: 0.8, pitch: 1.0 });
  const { addXP } = useProgress();
  const userId = useUserId();

  const [words, setWords] = useState<BeeWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [sentenceUsed, setSentenceUsed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const shuffled = [...wordBank].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    setWords(shuffled);
  }, []);

  const currentWord = words[currentIndex];

  const speakWord = () => {
    if (currentWord) speak(currentWord.word);
  };

  const speakSentence = () => {
    if (currentWord) {
      setSentenceUsed(true);
      speak(currentWord.sentence);
    }
  };

  useEffect(() => {
    if (currentWord && !finished) {
      const timer = setTimeout(() => speakWord(), 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, words]);

  const handleSubmit = () => {
    if (!currentWord || showResult) return;
    const isCorrect = input.trim().toLowerCase() === currentWord.word.toLowerCase();
    setAttempts(prev => prev + 1);

    if (isCorrect) {
      const points = hintUsed || sentenceUsed ? 1 : 2;
      setScore(prev => prev + points);
      setShowResult("correct");
      speak("Correct! Well done!");
      setTimeout(advance, 1800);
    } else if (attempts >= 1) {
      setShowResult("wrong");
      speak(`The correct spelling is: ${currentWord.word.split("").join(", ")}`);
      setTimeout(advance, 2500);
    } else {
      setShowResult("wrong");
      speak("Try again!");
      setTimeout(() => {
        setShowResult(null);
        setInput("");
      }, 1200);
    }
  };

  const advance = () => {
    if (currentIndex + 1 >= words.length) {
      setFinished(true);
      const xp = score * 12 + 10;
      addXP(xp);
      if (userId) queuePendingScore(userId, "spelling_bee", score, ROUNDS * 2);
    } else {
      setCurrentIndex(prev => prev + 1);
      setInput("");
      setShowResult(null);
      setHintUsed(false);
      setSentenceUsed(false);
      setAttempts(0);
    }
  };

  const difficultyColor = (d: string) => {
    if (d === "easy") return "text-green-500";
    if (d === "medium") return "text-yellow-500";
    return "text-red-500";
  };

  if (words.length === 0) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/learn")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-foreground">🐝 Spelling Bee</h1>
          <p className="text-xs text-muted-foreground">
            Word {Math.min(currentIndex + 1, ROUNDS)} of {ROUNDS}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">{score}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {finished ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-10"
            >
              <Trophy className="w-16 h-16 text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Spelling Bee Complete!</h2>
              <p className="text-muted-foreground">
                You scored <span className="font-bold text-primary">{score}</span> out of {ROUNDS * 2} points
              </p>
              <div className="flex gap-1 justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-8 h-8 ${i < Math.ceil((score / (ROUNDS * 2)) * 5) ? "text-primary fill-primary" : "text-muted"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">+{score * 12 + 10} XP earned!</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()}>Play Again</Button>
                <Button variant="outline" onClick={() => navigate("/learn")}>Back to Learn</Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / ROUNDS) * 100}%` }}
                />
              </div>

              {/* Difficulty badge */}
              <div className="flex justify-center">
                <span className={`text-xs font-semibold uppercase ${difficultyColor(currentWord.difficulty)}`}>
                  {currentWord.difficulty}
                </span>
              </div>

              {/* Listen button */}
              <div className="flex flex-col items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={speakWord}
                  disabled={isSpeaking}
                  className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30 hover:bg-primary/20 transition-colors"
                >
                  <Volume2 className="w-10 h-10 text-primary" />
                </motion.button>
                <p className="text-sm text-muted-foreground">Tap to hear the word</p>
              </div>

              {/* Input */}
              <div className="space-y-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="Type the spelling..."
                  className="text-center text-lg tracking-widest font-mono"
                  autoFocus
                  disabled={showResult === "correct"}
                />

                {showResult === "correct" && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-green-500 font-bold">
                    ✅ Correct! {hintUsed || sentenceUsed ? "+1 point" : "+2 points"}
                  </motion.p>
                )}
                {showResult === "wrong" && attempts < 2 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-destructive font-bold">
                    ❌ Try once more!
                  </motion.p>
                )}
                {showResult === "wrong" && attempts >= 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-1">
                    <p className="text-destructive font-bold">The answer was:</p>
                    <p className="text-xl font-bold tracking-widest text-foreground">{currentWord.word.toUpperCase()}</p>
                  </motion.div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={!input.trim() || showResult === "correct"} className="flex-1">
                  Check
                </Button>
                <Button variant="outline" onClick={() => { setHintUsed(true); }} disabled={hintUsed}>
                  💡 Hint
                </Button>
                <Button variant="outline" onClick={speakSentence} disabled={isSpeaking}>
                  📝 Sentence
                </Button>
              </div>

              {/* Hint display */}
              {hintUsed && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-muted-foreground bg-muted p-3 rounded-xl">
                  💡 {currentWord.hint}
                </motion.p>
              )}

              {/* Skip */}
              <div className="text-center">
                <Button variant="ghost" size="sm" onClick={advance} className="text-muted-foreground">
                  <SkipForward className="w-4 h-4 mr-1" /> Skip
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
};

export default SpellingBee;
