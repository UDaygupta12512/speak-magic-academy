import { useState, useEffect, useCallback } from "react";
import { Gamepad2, Check, X, RotateCcw, Trophy, Keyboard, BookOpen, Zap, Volume2, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useUserId";
import { queuePendingScore } from "@/lib/offlineSync";

// Word Match Data
interface WordPair {
  word: string;
  meaning: string;
  options: string[];
}

const WORD_PAIRS: WordPair[] = [
  { word: "Happy", meaning: "Feeling joy or pleasure", options: ["Feeling joy or pleasure", "Feeling sad", "Feeling tired", "Feeling angry"] },
  { word: "Brave", meaning: "Not afraid of danger", options: ["Very fast", "Not afraid of danger", "Very quiet", "Very tall"] },
  { word: "Curious", meaning: "Wanting to learn or know more", options: ["Wanting to sleep", "Wanting to eat", "Wanting to learn or know more", "Wanting to play"] },
  { word: "Gentle", meaning: "Kind and careful", options: ["Very loud", "Kind and careful", "Very strong", "Very fast"] },
  { word: "Adventure", meaning: "An exciting experience", options: ["A boring day", "An exciting experience", "A scary dream", "A long sleep"] },
  { word: "Discover", meaning: "To find something new", options: ["To lose something", "To break something", "To find something new", "To forget something"] },
  { word: "Imagine", meaning: "To picture in your mind", options: ["To see with eyes", "To hear with ears", "To picture in your mind", "To touch with hands"] },
  { word: "Patient", meaning: "Able to wait calmly", options: ["Always running", "Able to wait calmly", "Always angry", "Always sleeping"] },
  { word: "Brilliant", meaning: "Very bright or smart", options: ["Very dark", "Very bright or smart", "Very slow", "Very quiet"] },
  { word: "Enormous", meaning: "Extremely large", options: ["Extremely small", "Extremely large", "Extremely fast", "Extremely loud"] },
];

// Spelling Data
interface SpellingWord {
  word: string;
  hint: string;
  scrambled: string;
}

const SPELLING_WORDS: SpellingWord[] = [
  { word: "apple", hint: "A red or green fruit 🍎", scrambled: "a_p_e" },
  { word: "happy", hint: "Feeling joy 😊", scrambled: "h_p_y" },
  { word: "school", hint: "Where you learn 🏫", scrambled: "s_h_ol" },
  { word: "friend", hint: "Someone you like 👫", scrambled: "f_i_nd" },
  { word: "water", hint: "You drink it 💧", scrambled: "w_t_r" },
  { word: "family", hint: "Mom, dad, siblings 👨‍👩‍👧‍👦", scrambled: "f_m_ly" },
  { word: "animal", hint: "Dog, cat, bird... 🐕", scrambled: "a_i_al" },
  { word: "rainbow", hint: "Colors in the sky 🌈", scrambled: "r_i_bow" },
  { word: "butterfly", hint: "A colorful insect 🦋", scrambled: "b_t_erfly" },
  { word: "elephant", hint: "Big animal with a trunk 🐘", scrambled: "e_e_hant" },
];

// Vocabulary Quiz Data
interface VocabQuestion {
  question: string;
  correctAnswer: string;
  options: string[];
  category: string;
}

const VOCAB_QUESTIONS: VocabQuestion[] = [
  { question: "What is the opposite of 'hot'?", correctAnswer: "Cold", options: ["Cold", "Warm", "Big", "Fast"], category: "Opposites" },
  { question: "What is the opposite of 'big'?", correctAnswer: "Small", options: ["Tall", "Small", "Wide", "Heavy"], category: "Opposites" },
  { question: "What is the past tense of 'go'?", correctAnswer: "Went", options: ["Goed", "Went", "Gone", "Going"], category: "Grammar" },
  { question: "Which word means 'very happy'?", correctAnswer: "Delighted", options: ["Sad", "Angry", "Delighted", "Tired"], category: "Synonyms" },
  { question: "What is a baby dog called?", correctAnswer: "Puppy", options: ["Kitten", "Puppy", "Cub", "Chick"], category: "Animals" },
  { question: "Which word rhymes with 'cat'?", correctAnswer: "Hat", options: ["Dog", "Hat", "Cup", "Ball"], category: "Rhyming" },
  { question: "What color do you get mixing red and blue?", correctAnswer: "Purple", options: ["Green", "Orange", "Purple", "Yellow"], category: "Colors" },
  { question: "Which word means 'very big'?", correctAnswer: "Huge", options: ["Tiny", "Huge", "Quick", "Soft"], category: "Synonyms" },
  { question: "What is the plural of 'child'?", correctAnswer: "Children", options: ["Childs", "Children", "Childrens", "Child"], category: "Grammar" },
  { question: "What is the opposite of 'fast'?", correctAnswer: "Slow", options: ["Quick", "Slow", "Bright", "Loud"], category: "Opposites" },
];

// Speed Round Data
interface SpeedWord {
  word: string;
  isReal: boolean;
}

const SPEED_WORDS: SpeedWord[] = [
  { word: "Beautiful", isReal: true },
  { word: "Flurpington", isReal: false },
  { word: "Elephant", isReal: true },
  { word: "Blixnard", isReal: false },
  { word: "Adventure", isReal: true },
  { word: "Snorklefuzz", isReal: false },
  { word: "Wonderful", isReal: true },
  { word: "Glimberwick", isReal: false },
  { word: "Butterfly", isReal: true },
  { word: "Zibblequack", isReal: false },
  { word: "Rainbow", isReal: true },
  { word: "Frozzlebert", isReal: false },
  { word: "Mysterious", isReal: true },
  { word: "Wumplesnort", isReal: false },
  { word: "Delicious", isReal: true },
];

// Word Scramble Data
interface ScrambleWord {
  word: string;
  hint: string;
}

const SCRAMBLE_WORDS: ScrambleWord[] = [
  { word: "garden", hint: "Where flowers grow 🌷" },
  { word: "pencil", hint: "You write with it ✏️" },
  { word: "summer", hint: "The hottest season ☀️" },
  { word: "monkey", hint: "Loves bananas 🐒" },
  { word: "doctor", hint: "Helps you when sick 🩺" },
  { word: "rocket", hint: "Flies into space 🚀" },
  { word: "guitar", hint: "A musical instrument 🎸" },
  { word: "planet", hint: "Earth is one 🌍" },
  { word: "castle", hint: "Where kings live 🏰" },
  { word: "dragon", hint: "A fire-breathing creature 🐉" },
];

type GameTab = "match" | "spelling" | "vocab" | "speed" | "scramble";
type GameState = "ready" | "playing" | "result";

const WordGames = () => {
  const userId = useUserId();
  const { addXP } = useProgress();
  const [activeTab, setActiveTab] = useState<GameTab>("match");
  
  // Word Match State
  const [matchState, setMatchState] = useState<GameState>("ready");
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchScore, setMatchScore] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [isMatchCorrect, setIsMatchCorrect] = useState<boolean | null>(null);
  const [shuffledMatches, setShuffledMatches] = useState<WordPair[]>([]);
  const [matchHighScore, setMatchHighScore] = useState(0);

  // Spelling State
  const [spellingState, setSpellingState] = useState<GameState>("ready");
  const [spellingIndex, setSpellingIndex] = useState(0);
  const [spellingScore, setSpellingScore] = useState(0);
  const [spellingInput, setSpellingInput] = useState("");
  const [isSpellingCorrect, setIsSpellingCorrect] = useState<boolean | null>(null);
  const [shuffledSpelling, setShuffledSpelling] = useState<SpellingWord[]>([]);

  // Vocab Quiz State
  const [vocabState, setVocabState] = useState<GameState>("ready");
  const [vocabIndex, setVocabIndex] = useState(0);
  const [vocabScore, setVocabScore] = useState(0);
  const [selectedVocab, setSelectedVocab] = useState<string | null>(null);
  const [isVocabCorrect, setIsVocabCorrect] = useState<boolean | null>(null);
  const [shuffledVocab, setShuffledVocab] = useState<VocabQuestion[]>([]);

  // Speed Round State
  const [speedState, setSpeedState] = useState<GameState>("ready");
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedTime, setSpeedTime] = useState(30);
  const [shuffledSpeed, setShuffledSpeed] = useState<SpeedWord[]>([]);
  const [speedFeedback, setSpeedFeedback] = useState<"correct" | "wrong" | null>(null);

  // Scramble State
  const [scrambleState, setScrambleState] = useState<GameState>("ready");
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [scrambleScore, setScrambleScore] = useState(0);
  const [scrambleInput, setScrambleInput] = useState("");
  const [isScrambleCorrect, setIsScrambleCorrect] = useState<boolean | null>(null);
  const [shuffledScramble, setShuffledScramble] = useState<(ScrambleWord & { scrambled: string })[]>([]);

  // Load high scores
  useEffect(() => {
    const loadHighScores = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('game_scores')
          .select('score, game_type')
          .eq('user_id', userId)
          .in('game_type', ['word_match', 'spelling', 'vocab_quiz', 'speed_round'])
          .order('score', { ascending: false });
        
        if (data) {
          const matchData = data.find(d => d.game_type === 'word_match');
          if (matchData) setMatchHighScore(matchData.score);
        }
      } catch (err) {
        console.error("Could not load high scores:", err);
      }
    };
    loadHighScores();
  }, [userId]);

  // Speed round timer
  useEffect(() => {
    if (speedState !== "playing" || speedTime <= 0) return;
    
    const timer = setInterval(() => {
      setSpeedTime((t) => {
        if (t <= 1) {
          endSpeedRound();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [speedState, speedTime]);

  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }, []);

  const speak = (text: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Word Match Functions
  const startMatchGame = () => {
    const shuffled = shuffleArray([...WORD_PAIRS])
      .slice(0, 5)
      .map(wp => ({ ...wp, options: shuffleArray([...wp.options]) }));
    setShuffledMatches(shuffled);
    setMatchIndex(0);
    setMatchScore(0);
    setSelectedMatch(null);
    setIsMatchCorrect(null);
    setMatchState("playing");
  };

  const handleMatchAnswer = async (answer: string) => {
    if (selectedMatch) return;
    
    const correct = answer === shuffledMatches[matchIndex].meaning;
    setSelectedMatch(answer);
    setIsMatchCorrect(correct);
    if (correct) setMatchScore((s) => s + 1);

    setTimeout(async () => {
      if (matchIndex < shuffledMatches.length - 1) {
        setMatchIndex((i) => i + 1);
        setSelectedMatch(null);
        setIsMatchCorrect(null);
      } else {
        const finalScore = correct ? matchScore + 1 : matchScore;
        setMatchState("result");
        
        if (userId) {
          try {
            await supabase.from('game_scores').insert({
              user_id: userId, game_type: 'word_match', score: finalScore, max_score: shuffledMatches.length,
            });
          } catch (err) {
            console.error("Could not save score, queuing:", err);
            queuePendingScore(userId, 'word_match', finalScore, shuffledMatches.length);
          }
          if (finalScore > matchHighScore) setMatchHighScore(finalScore);
        }
        
        await addXP(finalScore * 10);
        toast({ title: "Game Complete! 🎮", description: `You earned ${finalScore * 10} XP!` });
      }
    }, 1500);
  };

  // Spelling Functions
  const startSpellingGame = () => {
    const shuffled = shuffleArray([...SPELLING_WORDS]).slice(0, 5);
    setShuffledSpelling(shuffled);
    setSpellingIndex(0);
    setSpellingScore(0);
    setSpellingInput("");
    setIsSpellingCorrect(null);
    setSpellingState("playing");
  };

  const checkSpelling = async () => {
    const correct = spellingInput.toLowerCase().trim() === shuffledSpelling[spellingIndex].word.toLowerCase();
    setIsSpellingCorrect(correct);
    if (correct) setSpellingScore((s) => s + 1);

    setTimeout(async () => {
      if (spellingIndex < shuffledSpelling.length - 1) {
        setSpellingIndex((i) => i + 1);
        setSpellingInput("");
        setIsSpellingCorrect(null);
      } else {
        const finalScore = correct ? spellingScore + 1 : spellingScore;
        setSpellingState("result");
        
        if (userId) {
          try {
            await supabase.from('game_scores').insert({
              user_id: userId, game_type: 'spelling', score: finalScore, max_score: shuffledSpelling.length,
            });
          } catch (err) {
            console.error("Could not save score, queuing:", err);
            queuePendingScore(userId, 'spelling', finalScore, shuffledSpelling.length);
          }
        }
        
        await addXP(finalScore * 15);
        toast({ title: "Spelling Complete! ✍️", description: `You earned ${finalScore * 15} XP!` });
      }
    }, 2000);
  };

  // Vocab Quiz Functions
  const startVocabGame = () => {
    const shuffled = shuffleArray([...VOCAB_QUESTIONS])
      .slice(0, 5)
      .map(q => ({ ...q, options: shuffleArray([...q.options]) }));
    setShuffledVocab(shuffled);
    setVocabIndex(0);
    setVocabScore(0);
    setSelectedVocab(null);
    setIsVocabCorrect(null);
    setVocabState("playing");
  };

  const handleVocabAnswer = async (answer: string) => {
    if (selectedVocab) return;
    
    const correct = answer === shuffledVocab[vocabIndex].correctAnswer;
    setSelectedVocab(answer);
    setIsVocabCorrect(correct);
    if (correct) setVocabScore((s) => s + 1);

    setTimeout(async () => {
      if (vocabIndex < shuffledVocab.length - 1) {
        setVocabIndex((i) => i + 1);
        setSelectedVocab(null);
        setIsVocabCorrect(null);
      } else {
        const finalScore = correct ? vocabScore + 1 : vocabScore;
        setVocabState("result");
        
        if (userId) {
          try {
            await supabase.from('game_scores').insert({
              user_id: userId, game_type: 'vocab_quiz', score: finalScore, max_score: shuffledVocab.length,
            });
          } catch (err) {
            console.error("Could not save score, queuing:", err);
            queuePendingScore(userId, 'vocab_quiz', finalScore, shuffledVocab.length);
          }
        }
        
        await addXP(finalScore * 12);
        toast({ title: "Quiz Complete! 📚", description: `You earned ${finalScore * 12} XP!` });
      }
    }, 1500);
  };

  // Speed Round Functions
  const startSpeedGame = () => {
    const shuffled = shuffleArray([...SPEED_WORDS]);
    setShuffledSpeed(shuffled);
    setSpeedIndex(0);
    setSpeedScore(0);
    setSpeedTime(30);
    setSpeedFeedback(null);
    setSpeedState("playing");
  };

  const handleSpeedAnswer = (isReal: boolean) => {
    const correct = isReal === shuffledSpeed[speedIndex].isReal;
    setSpeedFeedback(correct ? "correct" : "wrong");
    if (correct) setSpeedScore((s) => s + 1);

    setTimeout(() => {
      setSpeedFeedback(null);
      if (speedIndex < shuffledSpeed.length - 1) {
        setSpeedIndex((i) => i + 1);
      } else {
        endSpeedRound();
      }
    }, 300);
  };

  const endSpeedRound = async () => {
    setSpeedState("result");
    
    if (userId) {
      try {
        await supabase.from('game_scores').insert({
          user_id: userId, game_type: 'speed_round', score: speedScore, max_score: shuffledSpeed.length,
        });
      } catch (err) {
        console.error("Could not save score, queuing:", err);
        queuePendingScore(userId, 'speed_round', speedScore, shuffledSpeed.length);
      }
    }
    
    await addXP(speedScore * 5);
    toast({ title: "Speed Round Complete! ⚡", description: `You earned ${speedScore * 5} XP!` });
  };

  // Scramble Functions
  const scrambleWord = (w: string) => {
    const arr = w.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const out = arr.join("");
    return out === w ? scrambleWord(w) : out;
  };

  const startScrambleGame = () => {
    const shuffled = shuffleArray([...SCRAMBLE_WORDS]).slice(0, 5).map((w) => ({
      ...w,
      scrambled: scrambleWord(w.word),
    }));
    setShuffledScramble(shuffled);
    setScrambleIndex(0);
    setScrambleScore(0);
    setScrambleInput("");
    setIsScrambleCorrect(null);
    setScrambleState("playing");
  };

  const checkScramble = async () => {
    const correct = scrambleInput.toLowerCase().trim() === shuffledScramble[scrambleIndex].word.toLowerCase();
    setIsScrambleCorrect(correct);
    if (correct) setScrambleScore((s) => s + 1);

    setTimeout(async () => {
      if (scrambleIndex < shuffledScramble.length - 1) {
        setScrambleIndex((i) => i + 1);
        setScrambleInput("");
        setIsScrambleCorrect(null);
      } else {
        const finalScore = correct ? scrambleScore + 1 : scrambleScore;
        setScrambleState("result");
        if (userId) {
          try {
            await supabase.from("game_scores").insert({
              user_id: userId, game_type: "scramble", score: finalScore, max_score: shuffledScramble.length,
            });
          } catch (err) {
            console.error("Could not save score, queuing:", err);
            queuePendingScore(userId, "scramble", finalScore, shuffledScramble.length);
          }
        }
        await addXP(finalScore * 12);
        toast({ title: "Scramble Complete! 🔀", description: `You earned ${finalScore * 12} XP!` });
      }
    }, 1500);
  };

  const currentMatch = shuffledMatches[matchIndex];
  const currentSpelling = shuffledSpelling[spellingIndex];
  const currentVocab = shuffledVocab[vocabIndex];
  const currentSpeed = shuffledSpeed[speedIndex];
  const currentScramble = shuffledScramble[scrambleIndex];

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title="Word Games"
        showBack
        icon={<Gamepad2 className="w-5 h-5 text-primary" />}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GameTab)} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-5">
          <TabsTrigger value="match" className="text-[10px] px-0.5">
            <BookOpen className="w-3.5 h-3.5 mr-0.5" />
            Match
          </TabsTrigger>
          <TabsTrigger value="spelling" className="text-[10px] px-0.5">
            <Keyboard className="w-3.5 h-3.5 mr-0.5" />
            Spell
          </TabsTrigger>
          <TabsTrigger value="vocab" className="text-[10px] px-0.5">
            <Trophy className="w-3.5 h-3.5 mr-0.5" />
            Quiz
          </TabsTrigger>
          <TabsTrigger value="speed" className="text-[10px] px-0.5">
            <Zap className="w-3.5 h-3.5 mr-0.5" />
            Speed
          </TabsTrigger>
          <TabsTrigger value="scramble" className="text-[10px] px-0.5">
            <Shuffle className="w-3.5 h-3.5 mr-0.5" />
            Mix
          </TabsTrigger>
        </TabsList>

        {/* Word Match Tab */}
        <TabsContent value="match" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {matchState === "ready" && (
              <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-light flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-purple" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Word Match</h2>
                <p className="text-muted-foreground text-sm mb-6">Match words with their meanings!</p>
                {matchHighScore > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-4 text-yellow">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold">High Score: {matchHighScore}/5</span>
                  </div>
                )}
                <Button onClick={startMatchGame} size="lg" className="rounded-full px-8">Start Game</Button>
              </motion.div>
            )}

            {matchState === "playing" && currentMatch && (
              <motion.div key={`match-${matchIndex}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Question {matchIndex + 1}/{shuffledMatches.length}</span>
                  <span className="text-sm font-bold text-primary">Score: {matchScore}</span>
                </div>
                <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                  <motion.div className="h-full bg-purple" animate={{ width: `${((matchIndex + 1) / shuffledMatches.length) * 100}%` }} />
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-card mb-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">What does this word mean?</p>
                  <h2 className="text-3xl font-bold text-primary">{currentMatch.word}</h2>
                </div>
                <div className="space-y-3">
                  {currentMatch.options.map((opt, i) => {
                    const isSelected = selectedMatch === opt;
                    const isCorrectAnswer = opt === currentMatch.meaning;
                    const showResult = selectedMatch !== null;
                    let bgClass = "bg-card hover:bg-muted";
                    if (showResult) {
                      if (isCorrectAnswer) bgClass = "bg-green-light border-2 border-green";
                      else if (isSelected && !isMatchCorrect) bgClass = "bg-destructive/10 border-2 border-destructive";
                    }
                    return (
                      <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        onClick={() => handleMatchAnswer(opt)} disabled={selectedMatch !== null}
                        className={`w-full p-4 rounded-xl text-left transition-colors ${bgClass} flex items-center justify-between`}>
                        <span className="font-medium text-foreground">{opt}</span>
                        {showResult && isCorrectAnswer && <Check className="w-5 h-5 text-green" />}
                        {showResult && isSelected && !isMatchCorrect && <X className="w-5 h-5 text-destructive" />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {matchState === "result" && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Great Job!</h2>
                <p className="text-4xl font-bold text-purple mb-4">{matchScore}/{shuffledMatches.length}</p>
                <Button onClick={startMatchGame} size="lg" className="rounded-full px-8 gap-2">
                  <RotateCcw className="w-4 h-4" />Play Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Spelling Tab */}
        <TabsContent value="spelling" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {spellingState === "ready" && (
              <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-light flex items-center justify-center">
                  <Keyboard className="w-10 h-10 text-orange" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Spelling Challenge</h2>
                <p className="text-muted-foreground text-sm mb-6">Use the hints to spell the words correctly!</p>
                <Button onClick={startSpellingGame} size="lg" className="rounded-full px-8">Start Game</Button>
              </motion.div>
            )}

            {spellingState === "playing" && currentSpelling && (
              <motion.div key={`spell-${spellingIndex}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Word {spellingIndex + 1}/{shuffledSpelling.length}</span>
                  <span className="text-sm font-bold text-primary">Score: {spellingScore}</span>
                </div>
                <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                  <motion.div className="h-full bg-orange" animate={{ width: `${((spellingIndex + 1) / shuffledSpelling.length) * 100}%` }} />
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-card mb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">{currentSpelling.hint}</p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <p className="text-2xl font-bold text-orange tracking-widest">{currentSpelling.scrambled}</p>
                    <Button variant="ghost" size="icon" onClick={() => speak(currentSpelling.word)}>
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <input
                  type="text" value={spellingInput} onChange={(e) => setSpellingInput(e.target.value)}
                  placeholder="Type the word..."
                  disabled={isSpellingCorrect !== null}
                  className={`w-full p-4 text-center text-xl font-bold rounded-xl border-2 mb-4 ${
                    isSpellingCorrect === null ? "border-muted bg-card" : isSpellingCorrect ? "border-green bg-green-light" : "border-destructive bg-destructive/10"
                  }`}
                  onKeyDown={(e) => e.key === "Enter" && spellingInput && checkSpelling()}
                />
                {isSpellingCorrect === false && (
                  <p className="text-center text-green font-bold mb-4">Correct spelling: {currentSpelling.word}</p>
                )}
                <Button onClick={checkSpelling} disabled={!spellingInput || isSpellingCorrect !== null} className="w-full rounded-xl gap-2">
                  <Check className="w-4 h-4" />Check Spelling
                </Button>
              </motion.div>
            )}

            {spellingState === "result" && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="text-6xl mb-4">✍️</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Spelling Complete!</h2>
                <p className="text-4xl font-bold text-orange mb-4">{spellingScore}/{shuffledSpelling.length}</p>
                <Button onClick={startSpellingGame} size="lg" className="rounded-full px-8 gap-2">
                  <RotateCcw className="w-4 h-4" />Play Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Vocab Quiz Tab */}
        <TabsContent value="vocab" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {vocabState === "ready" && (
              <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-light flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-green" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Vocabulary Quiz</h2>
                <p className="text-muted-foreground text-sm mb-6">Test your vocabulary knowledge!</p>
                <Button onClick={startVocabGame} size="lg" className="rounded-full px-8">Start Quiz</Button>
              </motion.div>
            )}

            {vocabState === "playing" && currentVocab && (
              <motion.div key={`vocab-${vocabIndex}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Question {vocabIndex + 1}/{shuffledVocab.length}</span>
                  <span className="text-sm font-bold text-primary">Score: {vocabScore}</span>
                </div>
                <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                  <motion.div className="h-full bg-green" animate={{ width: `${((vocabIndex + 1) / shuffledVocab.length) * 100}%` }} />
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-card mb-6">
                  <span className="text-xs px-2 py-1 rounded-full bg-green-light text-green mb-2 inline-block">{currentVocab.category}</span>
                  <h2 className="text-xl font-bold text-foreground">{currentVocab.question}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {currentVocab.options.map((opt, i) => {
                    const isSelected = selectedVocab === opt;
                    const isCorrectAnswer = opt === currentVocab.correctAnswer;
                    const showResult = selectedVocab !== null;
                    let bgClass = "bg-card hover:bg-muted";
                    if (showResult) {
                      if (isCorrectAnswer) bgClass = "bg-green-light border-2 border-green";
                      else if (isSelected && !isVocabCorrect) bgClass = "bg-destructive/10 border-2 border-destructive";
                    }
                    return (
                      <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        onClick={() => handleVocabAnswer(opt)} disabled={selectedVocab !== null}
                        className={`p-4 rounded-xl text-center font-bold transition-colors ${bgClass}`}>
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {vocabState === "result" && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Quiz Complete!</h2>
                <p className="text-4xl font-bold text-green mb-4">{vocabScore}/{shuffledVocab.length}</p>
                <Button onClick={startVocabGame} size="lg" className="rounded-full px-8 gap-2">
                  <RotateCcw className="w-4 h-4" />Play Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Speed Round Tab */}
        <TabsContent value="speed" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {speedState === "ready" && (
              <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-light flex items-center justify-center">
                  <Zap className="w-10 h-10 text-yellow" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Speed Round</h2>
                <p className="text-muted-foreground text-sm mb-6">Is it a real word or a made-up word?<br />30 seconds - be quick!</p>
                <Button onClick={startSpeedGame} size="lg" className="rounded-full px-8">Start!</Button>
              </motion.div>
            )}

            {speedState === "playing" && currentSpeed && (
              <motion.div key={`speed-${speedIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-yellow">⏱️ {speedTime}s</span>
                  <span className="text-lg font-bold text-primary">Score: {speedScore}</span>
                </div>
                <div className="h-2 bg-muted rounded-full mb-8 overflow-hidden">
                  <motion.div className="h-full bg-yellow" animate={{ width: `${(speedTime / 30) * 100}%` }} />
                </div>
                <motion.div
                  key={speedIndex}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`bg-card rounded-2xl p-8 shadow-card mb-8 text-center ${
                    speedFeedback === "correct" ? "ring-4 ring-green" : speedFeedback === "wrong" ? "ring-4 ring-destructive" : ""
                  }`}
                >
                  <h2 className="text-4xl font-bold text-foreground">{currentSpeed.word}</h2>
                </motion.div>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => handleSpeedAnswer(true)} size="lg" className="h-16 text-lg rounded-xl bg-green hover:bg-green/90">
                    ✓ Real Word
                  </Button>
                  <Button onClick={() => handleSpeedAnswer(false)} size="lg" className="h-16 text-lg rounded-xl bg-destructive hover:bg-destructive/90">
                    ✗ Fake Word
                  </Button>
                </div>
              </motion.div>
            )}

            {speedState === "result" && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="text-6xl mb-4">⚡</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Time's Up!</h2>
                <p className="text-4xl font-bold text-yellow mb-4">{speedScore} correct</p>
                <p className="text-muted-foreground mb-6">
                  {speedScore >= 10 ? "Lightning fast! 🌟" : speedScore >= 5 ? "Nice speed! 👏" : "Keep practicing! 💪"}
                </p>
                <Button onClick={startSpeedGame} size="lg" className="rounded-full px-8 gap-2">
                  <RotateCcw className="w-4 h-4" />Play Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Word Scramble Tab */}
        <TabsContent value="scramble" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {scrambleState === "ready" && (
              <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-light flex items-center justify-center">
                  <Shuffle className="w-10 h-10 text-pink" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Word Scramble</h2>
                <p className="text-muted-foreground text-sm mb-6">Unscramble the letters to find the word!</p>
                <Button onClick={startScrambleGame} size="lg" className="rounded-full px-8 bg-pink hover:bg-pink/90">Start Game</Button>
              </motion.div>
            )}

            {scrambleState === "playing" && currentScramble && (
              <motion.div key={`scramble-${scrambleIndex}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Word {scrambleIndex + 1}/{shuffledScramble.length}</span>
                  <span className="text-sm font-bold text-primary">Score: {scrambleScore}</span>
                </div>
                <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                  <motion.div className="h-full bg-pink" animate={{ width: `${((scrambleIndex + 1) / shuffledScramble.length) * 100}%` }} />
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-card mb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">{currentScramble.hint}</p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {currentScramble.scrambled.toUpperCase().split("").map((ch, i) => (
                      <span key={i} className="w-10 h-10 flex items-center justify-center rounded-lg bg-pink-light text-pink-900 font-bold text-xl">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={scrambleInput}
                  onChange={(e) => setScrambleInput(e.target.value)}
                  disabled={isScrambleCorrect !== null}
                  placeholder="Type the word..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-pink outline-none text-center text-lg font-semibold mb-3"
                  onKeyDown={(e) => { if (e.key === "Enter" && scrambleInput.trim()) checkScramble(); }}
                />
                {isScrambleCorrect !== null && (
                  <div className={`text-center font-bold mb-3 ${isScrambleCorrect ? "text-green" : "text-destructive"}`}>
                    {isScrambleCorrect ? "✓ Correct!" : `✗ The word was "${currentScramble.word}"`}
                  </div>
                )}
                <Button
                  onClick={checkScramble}
                  disabled={!scrambleInput.trim() || isScrambleCorrect !== null}
                  size="lg"
                  className="w-full rounded-xl bg-pink hover:bg-pink/90"
                >
                  Check
                </Button>
              </motion.div>
            )}

            {scrambleState === "result" && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="text-6xl mb-4">🔀</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Great unscrambling!</h2>
                <p className="text-4xl font-bold text-pink mb-4">{scrambleScore}/{shuffledScramble.length}</p>
                <Button onClick={startScrambleGame} size="lg" className="rounded-full px-8 gap-2 bg-pink hover:bg-pink/90">
                  <RotateCcw className="w-4 h-4" />Play Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WordGames;