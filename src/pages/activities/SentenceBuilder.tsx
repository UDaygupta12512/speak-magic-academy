import { useState, useCallback } from "react";
import { PenTool, Check, RotateCcw, Shuffle, Trophy, ArrowRight, HelpCircle } from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";

interface Sentence {
  words: string[];
  hint: string;
  difficulty: "easy" | "medium" | "hard";
}

const SENTENCES: Sentence[] = [
  // Easy (3-4 words)
  { words: ["I", "love", "you"], hint: "Express your feelings", difficulty: "easy" },
  { words: ["The", "cat", "sleeps"], hint: "What is the pet doing?", difficulty: "easy" },
  { words: ["Birds", "can", "fly"], hint: "What can birds do?", difficulty: "easy" },
  { words: ["She", "is", "happy"], hint: "How does she feel?", difficulty: "easy" },
  { words: ["Dogs", "like", "bones"], hint: "What do dogs enjoy?", difficulty: "easy" },
  { words: ["I", "am", "hungry"], hint: "You want to eat", difficulty: "easy" },
  
  // Medium (4-5 words)
  { words: ["I", "like", "to", "play"], hint: "What do you enjoy?", difficulty: "medium" },
  { words: ["The", "sun", "is", "bright"], hint: "Describe the weather", difficulty: "medium" },
  { words: ["She", "reads", "a", "book"], hint: "What is she doing?", difficulty: "medium" },
  { words: ["We", "go", "to", "school"], hint: "Where do children go?", difficulty: "medium" },
  { words: ["My", "dog", "loves", "running"], hint: "A pet's activity", difficulty: "medium" },
  { words: ["The", "flower", "is", "beautiful"], hint: "Describe the plant", difficulty: "medium" },
  
  // Hard (5-7 words)
  { words: ["I", "can", "speak", "English", "well"], hint: "A skill you're learning", difficulty: "hard" },
  { words: ["They", "are", "playing", "in", "the", "park"], hint: "Where are they playing?", difficulty: "hard" },
  { words: ["My", "mother", "cooks", "delicious", "food"], hint: "What does mom do?", difficulty: "hard" },
  { words: ["The", "children", "are", "having", "fun"], hint: "What are kids doing?", difficulty: "hard" },
  { words: ["I", "want", "to", "learn", "new", "things"], hint: "What do you want?", difficulty: "hard" },
  { words: ["She", "goes", "to", "the", "library", "everyday"], hint: "Daily routine", difficulty: "hard" },
];

type GameState = "ready" | "playing" | "checking" | "result";
type Difficulty = "easy" | "medium" | "hard" | "mixed";

const SentenceBuilder = () => {
  const { addXP } = useProgress();
  const [gameState, setGameState] = useState<GameState>("ready");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const totalRounds = 5;

  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }, []);

  const getFilteredSentences = useCallback(() => {
    if (difficulty === "mixed") return SENTENCES;
    return SENTENCES.filter(s => s.difficulty === difficulty);
  }, [difficulty]);

  const loadNextSentence = useCallback(() => {
    const filtered = getFilteredSentences();
    const available = filtered.filter((_, i) => !usedIndices.has(SENTENCES.indexOf(filtered[i])));
    
    if (available.length === 0) {
      setUsedIndices(new Set());
      loadNextSentence();
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * available.length);
    const sentence = available[randomIndex];
    const originalIndex = SENTENCES.indexOf(sentence);
    
    setUsedIndices(prev => new Set([...prev, originalIndex]));
    setCurrentSentence(sentence);
    
    // Shuffle words until they're different from the original
    let shuffled = shuffleArray([...sentence.words]);
    let attempts = 0;
    while (shuffled.join(" ") === sentence.words.join(" ") && attempts < 10) {
      shuffled = shuffleArray([...sentence.words]);
      attempts++;
    }
    
    setUserOrder(shuffled);
    setIsCorrect(null);
    setShowHint(false);
  }, [getFilteredSentences, usedIndices, shuffleArray]);

  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setScore(0);
    setRound(0);
    setUsedIndices(new Set());
    setGameState("playing");
    
    // Load first sentence after state updates
    setTimeout(() => {
      const filtered = selectedDifficulty === "mixed" 
        ? SENTENCES 
        : SENTENCES.filter(s => s.difficulty === selectedDifficulty);
      const randomIndex = Math.floor(Math.random() * filtered.length);
      const sentence = filtered[randomIndex];
      
      setUsedIndices(new Set([SENTENCES.indexOf(sentence)]));
      setCurrentSentence(sentence);
      
      let shuffled = shuffleArray([...sentence.words]);
      let attempts = 0;
      while (shuffled.join(" ") === sentence.words.join(" ") && attempts < 10) {
        shuffled = shuffleArray([...sentence.words]);
        attempts++;
      }
      setUserOrder(shuffled);
    }, 0);
  };

  const checkAnswer = async () => {
    if (!currentSentence) return;
    
    setGameState("checking");
    const correct = userOrder.join(" ") === currentSentence.words.join(" ");
    setIsCorrect(correct);
    
    if (correct) {
      setScore((s) => s + 1);
    }

    setTimeout(async () => {
      if (round < totalRounds - 1) {
        setRound((r) => r + 1);
        setGameState("playing");
        loadNextSentence();
      } else {
        const finalScore = correct ? score + 1 : score;
        const xpMultiplier = difficulty === "hard" ? 20 : difficulty === "medium" ? 15 : 10;
        const xpEarned = finalScore * xpMultiplier;
        await addXP(xpEarned);
        toast({
          title: "Great building! 🏗️",
          description: `You earned ${xpEarned} XP!`,
        });
        setGameState("result");
      }
    }, 2000);
  };

  const resetOrder = () => {
    if (currentSentence) {
      let shuffled = shuffleArray([...currentSentence.words]);
      let attempts = 0;
      while (shuffled.join(" ") === currentSentence.words.join(" ") && attempts < 10) {
        shuffled = shuffleArray([...currentSentence.words]);
        attempts++;
      }
      setUserOrder(shuffled);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "bg-green-light text-green";
      case "medium": return "bg-yellow-light text-yellow";
      case "hard": return "bg-destructive/10 text-destructive";
      default: return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title="Sentence Builder"
        showBack
        icon={<PenTool className="w-5 h-5 text-primary" />}
      />

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {gameState === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-light flex items-center justify-center">
                <PenTool className="w-10 h-10 text-green" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Sentence Builder</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Drag and arrange words to build<br />
                correct sentences!
              </p>
              
              <div className="space-y-3 max-w-xs mx-auto">
                <p className="text-sm font-medium text-foreground">Choose difficulty:</p>
                
                <Button
                  onClick={() => startGame("easy")}
                  variant="outline"
                  className="w-full justify-between rounded-xl h-auto py-3"
                >
                  <span className="font-bold">Easy</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor("easy")}`}>
                    3-4 words
                  </span>
                </Button>
                
                <Button
                  onClick={() => startGame("medium")}
                  variant="outline"
                  className="w-full justify-between rounded-xl h-auto py-3"
                >
                  <span className="font-bold">Medium</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor("medium")}`}>
                    4-5 words
                  </span>
                </Button>
                
                <Button
                  onClick={() => startGame("hard")}
                  variant="outline"
                  className="w-full justify-between rounded-xl h-auto py-3"
                >
                  <span className="font-bold">Hard</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor("hard")}`}>
                    5-7 words
                  </span>
                </Button>
                
                <Button
                  onClick={() => startGame("mixed")}
                  className="w-full rounded-xl h-auto py-3 mt-4"
                >
                  <span className="font-bold">Mixed Challenge</span>
                </Button>
              </div>
            </motion.div>
          )}

          {(gameState === "playing" || gameState === "checking") && currentSentence && (
            <motion.div
              key={`round-${round}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Round {round + 1} of {totalRounds}
                </span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(currentSentence.difficulty)}`}>
                    {currentSentence.difficulty}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    Score: {score}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-green"
                  animate={{ width: `${((round + 1) / totalRounds) * 100}%` }}
                />
              </div>

              {/* Hint */}
              {showHint ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-yellow-light rounded-xl p-3 mb-4"
                >
                  <p className="text-sm font-medium text-yellow-900">
                    💡 {currentSentence.hint}
                  </p>
                </motion.div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(true)}
                  className="mb-4 text-muted-foreground"
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Show Hint
                </Button>
              )}

              {/* Word arrangement area */}
              <div className="bg-muted rounded-2xl p-4 min-h-[100px] mb-4">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  Drag to rearrange the words
                </p>
                <Reorder.Group
                  axis="x"
                  values={userOrder}
                  onReorder={setUserOrder}
                  className="flex flex-wrap gap-2 justify-center"
                >
                  {userOrder.map((word, index) => (
                    <Reorder.Item
                      key={`${word}-${index}`}
                      value={word}
                      className={`px-4 py-2 rounded-xl font-medium cursor-grab active:cursor-grabbing select-none transition-colors ${
                        gameState === "checking"
                          ? isCorrect
                            ? "bg-green text-white"
                            : "bg-destructive text-white"
                          : "bg-card shadow-soft hover:bg-primary hover:text-primary-foreground"
                      }`}
                      whileDrag={{ scale: 1.1, zIndex: 10 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {word}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              {/* Correct answer (shown when wrong) */}
              {gameState === "checking" && !isCorrect && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-light rounded-xl p-3 mb-4 text-center"
                >
                  <p className="text-sm text-green-900">
                    ✓ Correct: <strong>{currentSentence.words.join(" ")}</strong>
                  </p>
                </motion.div>
              )}

              {/* Result feedback */}
              {gameState === "checking" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center mb-4"
                >
                  <span className="text-4xl">{isCorrect ? "✅" : "❌"}</span>
                  <p className="font-bold text-foreground mt-2">
                    {isCorrect ? "Perfect!" : "Not quite..."}
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              {gameState === "playing" && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={resetOrder}
                    className="flex-1 rounded-xl gap-2"
                  >
                    <Shuffle className="w-4 h-4" />
                    Shuffle
                  </Button>
                  <Button
                    onClick={checkAnswer}
                    className="flex-1 rounded-xl gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Check
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {gameState === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-yellow-light flex items-center justify-center">
                <Trophy className="w-12 h-12 text-yellow" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Great Job!</h2>
              <p className="text-4xl font-bold text-green mb-2">
                {score}/{totalRounds}
              </p>
              <p className="text-muted-foreground mb-6">
                {score === totalRounds
                  ? "Perfect score! You're a sentence master! 🌟"
                  : score >= 3
                  ? "Well done! Keep practicing! 👏"
                  : "Good effort! Try again! 💪"}
              </p>
              
              <div className="space-y-3">
                <Button onClick={() => startGame(difficulty)} size="lg" className="rounded-full px-8 gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Play Again ({difficulty})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setGameState("ready")} 
                  className="w-full rounded-full"
                >
                  Change Difficulty
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SentenceBuilder;