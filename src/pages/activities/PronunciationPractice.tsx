import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Volume2, 
  Mic, 
  MicOff, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Headphones,
  Trophy,
  ChevronRight
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTextToSpeech, useSpeechRecognition } from "@/hooks/useVoice";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";

interface PracticeSentence {
  id: string;
  text: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

const sentences: PracticeSentence[] = [
  // Easy
  { id: "e1", text: "Hello, my name is Sam.", difficulty: "easy", category: "Greetings" },
  { id: "e2", text: "I like to play with my dog.", difficulty: "easy", category: "Daily Life" },
  { id: "e3", text: "The cat is on the mat.", difficulty: "easy", category: "Animals" },
  { id: "e4", text: "She has a red ball.", difficulty: "easy", category: "Colors" },
  { id: "e5", text: "We go to school every day.", difficulty: "easy", category: "School" },
  
  // Medium
  { id: "m1", text: "The beautiful butterfly flew over the garden.", difficulty: "medium", category: "Nature" },
  { id: "m2", text: "My favorite subject is mathematics.", difficulty: "medium", category: "School" },
  { id: "m3", text: "Please remember to bring your umbrella.", difficulty: "medium", category: "Weather" },
  { id: "m4", text: "The children are playing in the playground.", difficulty: "medium", category: "Activities" },
  { id: "m5", text: "Would you like some chocolate cookies?", difficulty: "medium", category: "Food" },
  
  // Hard
  { id: "h1", text: "The extraordinary scientist discovered a remarkable phenomenon.", difficulty: "hard", category: "Science" },
  { id: "h2", text: "Thoroughly think through your thoughts before speaking.", difficulty: "hard", category: "Tongue Twisters" },
  { id: "h3", text: "She sells seashells by the seashore.", difficulty: "hard", category: "Tongue Twisters" },
  { id: "h4", text: "The archaeological expedition uncovered ancient treasures.", difficulty: "hard", category: "History" },
  { id: "h5", text: "Particularly peculiar patterns appeared in the photograph.", difficulty: "hard", category: "Tongue Twisters" },
];

const difficultyColors = {
  easy: "bg-[hsl(var(--green))]",
  medium: "bg-[hsl(var(--yellow))]",
  hard: "bg-[hsl(var(--orange))]",
};

const PronunciationPractice = () => {
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [currentSentence, setCurrentSentence] = useState<PracticeSentence | null>(null);
  const [userAttempt, setUserAttempt] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  
  const tts = useTextToSpeech({ rate: 0.85, pitch: 1.1 });
  const speech = useSpeechRecognition({ continuous: false, interimResults: true });
  const { addXP } = useProgress();

  // Get a random sentence based on difficulty
  const getNewSentence = useCallback(() => {
    const filtered = sentences.filter(s => s.difficulty === difficulty);
    const randomSentence = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrentSentence(randomSentence);
    setUserAttempt("");
    setShowResult(false);
    speech.reset();
  }, [difficulty, speech]);

  useEffect(() => {
    getNewSentence();
  }, [difficulty]);

  // Handle speech recognition result
  useEffect(() => {
    if (speech.transcript && !speech.isListening) {
      setUserAttempt(speech.transcript);
      setShowResult(true);
      evaluateAttempt(speech.transcript);
    }
  }, [speech.transcript, speech.isListening]);

  const playTTS = () => {
    if (currentSentence) {
      tts.speak(currentSentence.text);
    }
  };

  const startRecording = () => {
    setUserAttempt("");
    setShowResult(false);
    speech.reset();
    speech.start();
  };

  const stopRecording = () => {
    speech.stop();
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/[^\w\s]/g, "").trim();
    const s2 = str2.toLowerCase().replace(/[^\w\s]/g, "").trim();
    
    if (s1 === s2) return 100;
    
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matchingWords = 0;
    const totalWords = Math.max(words1.length, words2.length);
    
    words2.forEach(word => {
      if (words1.includes(word)) {
        matchingWords++;
      }
    });
    
    return Math.round((matchingWords / totalWords) * 100);
  };

  const evaluateAttempt = async (attempt: string) => {
    if (!currentSentence) return;
    
    const similarity = calculateSimilarity(currentSentence.text, attempt);
    setAttempts(prev => prev + 1);
    
    if (similarity >= 80) {
      const points = difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 20;
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      if (streak > 0 && (streak + 1) % 3 === 0) {
        await addXP(points + 5);
        toast({
          title: `🔥 ${streak + 1} in a row!`,
          description: `+${points + 5} XP for your streak!`,
        });
      } else {
        await addXP(points);
        toast({
          title: "Great pronunciation! 🎉",
          description: `+${points} XP earned!`,
        });
      }
    } else {
      setStreak(0);
    }
  };

  const getResultColor = () => {
    if (!userAttempt || !currentSentence) return "";
    const similarity = calculateSimilarity(currentSentence.text, userAttempt);
    if (similarity >= 80) return "text-[hsl(var(--green))]";
    if (similarity >= 50) return "text-[hsl(var(--yellow))]";
    return "text-[hsl(var(--orange))]";
  };

  const getSimilarityScore = () => {
    if (!userAttempt || !currentSentence) return 0;
    return calculateSimilarity(currentSentence.text, userAttempt);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Pronunciation"
        icon={<Headphones className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-card rounded-xl p-3 shadow-card mb-4"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[hsl(var(--yellow))]" />
            <span className="font-bold text-foreground">{score} pts</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Attempts: {attempts}</span>
            <span className="flex items-center gap-1">
              🔥 {streak}
            </span>
          </div>
        </motion.div>

        {/* Difficulty Selector */}
        <div className="flex gap-2 mb-4">
          {(["easy", "medium", "hard"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                difficulty === level
                  ? `${difficultyColors[level]} text-white shadow-md`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>

        {/* Main Practice Card */}
        <motion.div
          key={currentSentence?.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl shadow-card p-5 mb-4"
        >
          {/* Category Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
              {currentSentence?.category}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={getNewSentence}
              className="h-8 w-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Sentence Display */}
          <div className="bg-muted rounded-xl p-4 mb-4">
            <p className="text-lg font-medium text-foreground text-center leading-relaxed">
              "{currentSentence?.text}"
            </p>
          </div>

          {/* Listen Button */}
          <div className="flex justify-center mb-4">
            <Button
              onClick={playTTS}
              disabled={tts.isSpeaking}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <Volume2 className={`w-5 h-5 ${tts.isSpeaking ? "animate-pulse" : ""}`} />
              {tts.isSpeaking ? "Playing..." : "Listen"}
            </Button>
          </div>

          {/* Recording Section */}
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Now try saying it yourself!
            </p>
            
            <div className="flex justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={speech.isListening ? stopRecording : startRecording}
                disabled={!speech.isSupported}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  speech.isListening
                    ? "bg-red-500 shadow-lg shadow-red-500/30"
                    : "bg-[hsl(var(--turquoise))] shadow-lg shadow-[hsl(var(--turquoise))]/30"
                }`}
              >
                {speech.isListening ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.button>
            </div>

            {speech.isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 rounded-full bg-red-500"
                  />
                  Listening...
                </div>
                {speech.interimTranscript && (
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    "{speech.interimTranscript}"
                  </p>
                )}
              </motion.div>
            )}

            {!speech.isSupported && (
              <p className="text-xs text-destructive text-center mt-2">
                Speech recognition not supported. Try Chrome or Edge.
              </p>
            )}
          </div>
        </motion.div>

        {/* Result Card */}
        <AnimatePresence>
          {showResult && userAttempt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card rounded-2xl shadow-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">Your Attempt</h3>
                <div className={`flex items-center gap-1 ${getResultColor()}`}>
                  {getSimilarityScore() >= 80 ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="font-bold">{getSimilarityScore()}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <Progress 
                value={getSimilarityScore()} 
                className="h-2"
              />

              {/* Comparison */}
              <div className="space-y-3">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Target:</p>
                  <p className="text-sm text-foreground">{currentSentence?.text}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">You said:</p>
                  <p className={`text-sm ${getResultColor()}`}>{userAttempt}</p>
                </div>
              </div>

              {/* Feedback */}
              <div className={`text-center p-3 rounded-xl ${
                getSimilarityScore() >= 80 
                  ? "bg-[hsl(var(--green))]/10 text-[hsl(var(--green))]"
                  : getSimilarityScore() >= 50
                  ? "bg-[hsl(var(--yellow))]/10 text-[hsl(var(--yellow-dark,var(--yellow)))]"
                  : "bg-[hsl(var(--orange))]/10 text-[hsl(var(--orange))]"
              }`}>
                {getSimilarityScore() >= 80 
                  ? "🎉 Excellent pronunciation!" 
                  : getSimilarityScore() >= 50
                  ? "👍 Good try! Keep practicing!"
                  : "💪 Listen again and try once more!"}
              </div>

              {/* Next Button */}
              <Button
                onClick={getNewSentence}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Next Sentence
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default PronunciationPractice;
