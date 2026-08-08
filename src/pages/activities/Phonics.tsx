import { useState } from "react";
import { Volume2, Check, ArrowRight, Star, Music, Puzzle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PhonicsLesson {
  id: string;
  sound: string;
  letter: string;
  words: string[];
  example: string;
  image: string;
}

interface RhymingGame {
  word: string;
  rhymes: string[];
  notRhyme: string;
}

interface BlendingWord {
  parts: string[];
  word: string;
  hint: string;
}

const LESSONS: PhonicsLesson[] = [
  { id: "a", sound: "/æ/", letter: "A", words: ["Apple", "Ant", "Alligator", "Astronaut"], example: "A is for Apple! 🍎", image: "🍎" },
  { id: "b", sound: "/b/", letter: "B", words: ["Ball", "Bear", "Butterfly", "Banana"], example: "B is for Ball! ⚽", image: "⚽" },
  { id: "c", sound: "/k/", letter: "C", words: ["Cat", "Car", "Cookie", "Cake"], example: "C is for Cat! 🐱", image: "🐱" },
  { id: "d", sound: "/d/", letter: "D", words: ["Dog", "Duck", "Dolphin", "Dragon"], example: "D is for Dog! 🐕", image: "🐕" },
  { id: "e", sound: "/ɛ/", letter: "E", words: ["Elephant", "Egg", "Eagle", "Elf"], example: "E is for Elephant! 🐘", image: "🐘" },
  { id: "f", sound: "/f/", letter: "F", words: ["Fish", "Frog", "Flower", "Fox"], example: "F is for Fish! 🐟", image: "🐟" },
  { id: "g", sound: "/g/", letter: "G", words: ["Goat", "Gorilla", "Guitar", "Giraffe"], example: "G is for Goat! 🐐", image: "🐐" },
  { id: "h", sound: "/h/", letter: "H", words: ["Hat", "Horse", "House", "Hippo"], example: "H is for Hat! 🎩", image: "🎩" },
  { id: "sh", sound: "/ʃ/", letter: "SH", words: ["Ship", "Sheep", "Shell", "Shark"], example: "SH says shhhh! 🚢", image: "🚢" },
  { id: "ch", sound: "/tʃ/", letter: "CH", words: ["Chair", "Cheese", "Chicken", "Cherry"], example: "CH is for Cheese! 🧀", image: "🧀" },
  { id: "th", sound: "/θ/", letter: "TH", words: ["Think", "Three", "Thumb", "Thunder"], example: "TH needs your tongue! 👅", image: "👅" },
  { id: "wh", sound: "/w/", letter: "WH", words: ["Whale", "Wheel", "Whistle", "White"], example: "WH is for Whale! 🐋", image: "🐋" },
];

const RHYMING_GAMES: RhymingGame[] = [
  { word: "Cat", rhymes: ["Hat", "Bat", "Mat"], notRhyme: "Dog" },
  { word: "Sun", rhymes: ["Fun", "Run", "Bun"], notRhyme: "Moon" },
  { word: "Tree", rhymes: ["Bee", "Free", "See"], notRhyme: "Leaf" },
  { word: "Day", rhymes: ["Play", "Say", "Way"], notRhyme: "Night" },
  { word: "Cake", rhymes: ["Make", "Lake", "Bake"], notRhyme: "Pie" },
  { word: "Bear", rhymes: ["Hair", "Chair", "Share"], notRhyme: "Lion" },
  { word: "Star", rhymes: ["Car", "Far", "Jar"], notRhyme: "Moon" },
  { word: "King", rhymes: ["Ring", "Sing", "Wing"], notRhyme: "Queen" },
];

const BLENDING_WORDS: BlendingWord[] = [
  { parts: ["c", "a", "t"], word: "cat", hint: "A furry pet 🐱" },
  { parts: ["d", "o", "g"], word: "dog", hint: "A loyal friend 🐕" },
  { parts: ["s", "u", "n"], word: "sun", hint: "Bright in the sky ☀️" },
  { parts: ["h", "a", "t"], word: "hat", hint: "You wear it on your head 🎩" },
  { parts: ["f", "i", "sh"], word: "fish", hint: "Lives in water 🐟" },
  { parts: ["b", "oo", "k"], word: "book", hint: "You read it 📚" },
  { parts: ["tr", "ee"], word: "tree", hint: "Grows in the forest 🌳" },
  { parts: ["fl", "ow", "er"], word: "flower", hint: "Pretty in a garden 🌸" },
];

type ActivityTab = "letters" | "rhyming" | "blending";
type GameState = "ready" | "playing" | "result";

const Phonics = () => {
  const { addXP } = useProgress();
  const [activeTab, setActiveTab] = useState<ActivityTab>("letters");
  
  // Letter sounds state
  const [currentLesson, setCurrentLesson] = useState<PhonicsLesson | null>(null);
  const [step, setStep] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Rhyming game state
  const [rhymingState, setRhymingState] = useState<GameState>("ready");
  const [rhymingIndex, setRhymingIndex] = useState(0);
  const [rhymingScore, setRhymingScore] = useState(0);
  const [selectedRhyme, setSelectedRhyme] = useState<string | null>(null);
  const [isRhymeCorrect, setIsRhymeCorrect] = useState<boolean | null>(null);
  const [shuffledRhymes, setShuffledRhymes] = useState<RhymingGame[]>([]);
  
  // Blending game state
  const [blendingState, setBlendingState] = useState<GameState>("ready");
  const [blendingIndex, setBlendingIndex] = useState(0);
  const [blendingScore, setBlendingScore] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isBlendCorrect, setIsBlendCorrect] = useState<boolean | null>(null);
  const [shuffledBlends, setShuffledBlends] = useState<BlendingWord[]>([]);
  const [showBlendHint, setShowBlendHint] = useState(false);

  const speak = (text: string, rate = 0.8) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.1;
    speechSynthesis.speak(utterance);
  };

  // Letter sounds functions
  const startLesson = (lesson: PhonicsLesson) => {
    setCurrentLesson(lesson);
    setStep(0);
    setTimeout(() => speak(lesson.letter), 500);
  };

  const nextStep = async () => {
    if (!currentLesson) return;
    
    if (step < currentLesson.words.length - 1) {
      setStep((s) => s + 1);
      speak(currentLesson.words[step + 1]);
    } else {
      setCompletedLessons((prev) => new Set([...prev, currentLesson.id]));
      await addXP(25);
      toast({
        title: "Lesson Complete! 🎉",
        description: "+25 XP for learning phonics!",
      });
      setCurrentLesson(null);
    }
  };

  // Rhyming game functions
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const startRhymingGame = () => {
    const shuffled = shuffleArray([...RHYMING_GAMES]).slice(0, 5);
    setShuffledRhymes(shuffled);
    setRhymingIndex(0);
    setRhymingScore(0);
    setSelectedRhyme(null);
    setIsRhymeCorrect(null);
    setRhymingState("playing");
  };

  const handleRhymeSelect = async (word: string) => {
    if (selectedRhyme) return;
    
    const currentGame = shuffledRhymes[rhymingIndex];
    const isCorrect = word !== currentGame.notRhyme;
    
    setSelectedRhyme(word);
    setIsRhymeCorrect(isCorrect);
    
    if (isCorrect) {
      setRhymingScore((s) => s + 1);
      speak(`Yes! ${word} rhymes with ${currentGame.word}!`);
    } else {
      speak(`${word} doesn't rhyme with ${currentGame.word}`);
    }

    setTimeout(async () => {
      if (rhymingIndex < shuffledRhymes.length - 1) {
        setRhymingIndex((i) => i + 1);
        setSelectedRhyme(null);
        setIsRhymeCorrect(null);
      } else {
        const finalScore = isCorrect ? rhymingScore + 1 : rhymingScore;
        const xpEarned = finalScore * 10;
        await addXP(xpEarned);
        toast({
          title: "Rhyming Complete! 🎵",
          description: `You earned ${xpEarned} XP!`,
        });
        setRhymingState("result");
      }
    }, 1500);
  };

  // Blending game functions
  const startBlendingGame = () => {
    const shuffled = shuffleArray([...BLENDING_WORDS]).slice(0, 5);
    setShuffledBlends(shuffled);
    setBlendingIndex(0);
    setBlendingScore(0);
    setUserInput("");
    setIsBlendCorrect(null);
    setShowBlendHint(false);
    setBlendingState("playing");
  };

  const speakBlendParts = () => {
    const blend = shuffledBlends[blendingIndex];
    blend.parts.forEach((part, i) => {
      setTimeout(() => speak(part, 0.6), i * 800);
    });
  };

  const checkBlending = async () => {
    const blend = shuffledBlends[blendingIndex];
    const isCorrect = userInput.toLowerCase().trim() === blend.word.toLowerCase();
    
    setIsBlendCorrect(isCorrect);
    
    if (isCorrect) {
      setBlendingScore((s) => s + 1);
      speak(`Correct! ${blend.word}!`);
    } else {
      speak(`The word is ${blend.word}`);
    }

    setTimeout(async () => {
      if (blendingIndex < shuffledBlends.length - 1) {
        setBlendingIndex((i) => i + 1);
        setUserInput("");
        setIsBlendCorrect(null);
        setShowBlendHint(false);
      } else {
        const finalScore = isCorrect ? blendingScore + 1 : blendingScore;
        const xpEarned = finalScore * 15;
        await addXP(xpEarned);
        toast({
          title: "Blending Complete! 🧩",
          description: `You earned ${xpEarned} XP!`,
        });
        setBlendingState("result");
      }
    }, 2000);
  };

  const currentRhyme = shuffledRhymes[rhymingIndex];
  const currentBlend = shuffledBlends[blendingIndex];

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title="Phonics & Sounds"
        showBack
        icon={<Volume2 className="w-5 h-5 text-primary" />}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActivityTab)} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-3">
          <TabsTrigger value="letters" className="gap-1 text-xs">
            <Volume2 className="w-3.5 h-3.5" />
            Letters
          </TabsTrigger>
          <TabsTrigger value="rhyming" className="gap-1 text-xs">
            <Music className="w-3.5 h-3.5" />
            Rhyming
          </TabsTrigger>
          <TabsTrigger value="blending" className="gap-1 text-xs">
            <Puzzle className="w-3.5 h-3.5" />
            Blending
          </TabsTrigger>
        </TabsList>

        {/* Letters Tab */}
        <TabsContent value="letters" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!currentLesson ? (
              <motion.div
                key="lessons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold text-foreground">Learn Letter Sounds</h2>
                  <p className="text-sm text-muted-foreground">
                    Tap a letter to learn its sound! 🔊
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {LESSONS.map((lesson, index) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    return (
                      <motion.button
                        key={lesson.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => startLesson(lesson)}
                        className={`relative aspect-square rounded-xl flex flex-col items-center justify-center shadow-card transition-transform hover:scale-105 ${
                          isCompleted ? "bg-green-light" : "bg-card"
                        }`}
                      >
                        <span className="text-2xl font-bold text-primary">{lesson.letter}</span>
                        <span className="text-[10px] text-muted-foreground">{lesson.sound}</span>
                        {isCompleted && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 bg-card rounded-2xl p-4 shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-light flex items-center justify-center">
                      <Star className="w-5 h-5 text-pink" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        {completedLessons.size} of {LESSONS.length} sounds learned
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-pink"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedLessons.size / LESSONS.length) * 100}%` }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="lesson"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="w-28 h-28 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center shadow-lg"
                >
                  <span className="text-5xl">{currentLesson.image}</span>
                </motion.div>

                <p className="text-2xl font-bold text-primary mb-1">{currentLesson.letter}</p>
                <p className="text-lg text-muted-foreground mb-1">{currentLesson.sound}</p>
                <p className="text-sm text-muted-foreground mb-4">{currentLesson.example}</p>

                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full mb-6 gap-2"
                  onClick={() => speak(currentLesson.letter)}
                >
                  <Volume2 className="w-5 h-5" />
                  Hear Sound
                </Button>

                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl p-5 shadow-card mb-4"
                >
                  <p className="text-sm text-muted-foreground mb-2">
                    Word {step + 1} of {currentLesson.words.length}
                  </p>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    {currentLesson.words[step]}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => speak(currentLesson.words[step])}
                  >
                    <Volume2 className="w-4 h-4" />
                    Listen
                  </Button>
                </motion.div>

                <Button onClick={nextStep} size="lg" className="rounded-full gap-2">
                  {step < currentLesson.words.length - 1 ? (
                    <>Next Word <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Complete <Check className="w-4 h-4" /></>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Rhyming Tab */}
        <TabsContent value="rhyming" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {rhymingState === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-light flex items-center justify-center">
                  <Music className="w-10 h-10 text-orange" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Rhyming Words</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Find the words that rhyme!<br />
                  Words that sound the same at the end
                </p>
                <Button onClick={startRhymingGame} size="lg" className="rounded-full px-8">
                  Start Game
                </Button>
              </motion.div>
            )}

            {rhymingState === "playing" && currentRhyme && (
              <motion.div
                key={`rhyme-${rhymingIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    Question {rhymingIndex + 1} of {shuffledRhymes.length}
                  </span>
                  <span className="text-sm font-bold text-primary">Score: {rhymingScore}</span>
                </div>

                <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                  <motion.div
                    className="h-full bg-orange"
                    animate={{ width: `${((rhymingIndex + 1) / shuffledRhymes.length) * 100}%` }}
                  />
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-card mb-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Which word rhymes with...</p>
                  <h2 className="text-4xl font-bold text-primary">{currentRhyme.word}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={() => speak(currentRhyme.word)}
                  >
                    <Volume2 className="w-4 h-4" />
                    Listen
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {shuffleArray([...currentRhyme.rhymes.slice(0, 1), currentRhyme.notRhyme]).map((word, i) => {
                    const isSelected = selectedRhyme === word;
                    const isCorrect = word !== currentRhyme.notRhyme;
                    const showResult = selectedRhyme !== null;
                    
                    let bgClass = "bg-card hover:bg-muted";
                    if (showResult) {
                      if (isSelected && isCorrect) bgClass = "bg-green-light border-2 border-green";
                      else if (isSelected && !isCorrect) bgClass = "bg-destructive/10 border-2 border-destructive";
                      else if (isCorrect) bgClass = "bg-green-light/50";
                    }

                    return (
                      <motion.button
                        key={word}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => handleRhymeSelect(word)}
                        disabled={selectedRhyme !== null}
                        className={`p-4 rounded-xl text-center font-bold text-lg transition-colors ${bgClass}`}
                      >
                        {word}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {rhymingState === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="text-6xl mb-4">🎵</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Great Rhyming!</h2>
                <p className="text-4xl font-bold text-orange mb-2">
                  {rhymingScore}/{shuffledRhymes.length}
                </p>
                <p className="text-muted-foreground mb-6">
                  {rhymingScore === shuffledRhymes.length ? "Perfect! 🌟" : "Keep practicing! 💪"}
                </p>
                <Button onClick={startRhymingGame} size="lg" className="rounded-full px-8">
                  Play Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Blending Tab */}
        <TabsContent value="blending" className="flex-1 px-4 py-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {blendingState === "ready" && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-light flex items-center justify-center">
                  <Puzzle className="w-10 h-10 text-purple" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Sound Blending</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Listen to the sounds and blend<br />
                  them together to make a word!
                </p>
                <Button onClick={startBlendingGame} size="lg" className="rounded-full px-8">
                  Start Game
                </Button>
              </motion.div>
            )}

            {blendingState === "playing" && currentBlend && (
              <motion.div
                key={`blend-${blendingIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    Word {blendingIndex + 1} of {shuffledBlends.length}
                  </span>
                  <span className="text-sm font-bold text-primary">Score: {blendingScore}</span>
                </div>

                <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                  <motion.div
                    className="h-full bg-purple"
                    animate={{ width: `${((blendingIndex + 1) / shuffledBlends.length) * 100}%` }}
                  />
                </div>

                <div className="bg-card rounded-2xl p-6 shadow-card mb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-4">Listen and blend the sounds:</p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {currentBlend.parts.map((part, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="w-14 h-14 rounded-xl bg-purple-light flex items-center justify-center"
                      >
                        <span className="text-xl font-bold text-purple">{part}</span>
                      </motion.div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={speakBlendParts}
                  >
                    <Volume2 className="w-4 h-4" />
                    Hear Sounds
                  </Button>
                </div>

                {showBlendHint && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-light rounded-xl p-3 mb-4 text-center"
                  >
                    <p className="text-sm text-yellow-900">Hint: {currentBlend.hint}</p>
                  </motion.div>
                )}

                <div className="mb-4">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type the word..."
                    disabled={isBlendCorrect !== null}
                    className={`w-full p-4 text-center text-xl font-bold rounded-xl border-2 ${
                      isBlendCorrect === null
                        ? "border-muted bg-card"
                        : isBlendCorrect
                        ? "border-green bg-green-light"
                        : "border-destructive bg-destructive/10"
                    }`}
                    onKeyDown={(e) => e.key === "Enter" && userInput && checkBlending()}
                  />
                </div>

                {isBlendCorrect === false && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-green font-bold mb-4"
                  >
                    The word was: {currentBlend.word}
                  </motion.p>
                )}

                <div className="flex gap-3">
                  {!showBlendHint && isBlendCorrect === null && (
                    <Button
                      variant="outline"
                      onClick={() => setShowBlendHint(true)}
                      className="flex-1 rounded-xl"
                    >
                      Show Hint
                    </Button>
                  )}
                  <Button
                    onClick={checkBlending}
                    disabled={!userInput || isBlendCorrect !== null}
                    className="flex-1 rounded-xl gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Check
                  </Button>
                </div>
              </motion.div>
            )}

            {blendingState === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="text-6xl mb-4">🧩</div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Great Blending!</h2>
                <p className="text-4xl font-bold text-purple mb-2">
                  {blendingScore}/{shuffledBlends.length}
                </p>
                <p className="text-muted-foreground mb-6">
                  {blendingScore === shuffledBlends.length ? "Perfect! 🌟" : "Keep practicing! 💪"}
                </p>
                <Button onClick={startBlendingGame} size="lg" className="rounded-full px-8">
                  Play Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Phonics;