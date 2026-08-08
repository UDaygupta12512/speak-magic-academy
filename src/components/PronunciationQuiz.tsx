import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Trophy, Star, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WordEntry {
  word: string;
  context: string;
}

interface PronunciationQuizProps {
  words: WordEntry[];
  onComplete: (correctCount: number, totalCount: number) => void;
  characterName: string;
}

type QuizState = "ready" | "listening" | "correct" | "incorrect" | "complete";

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z]/g, "").trim();

const PronunciationQuiz = ({ words, onComplete, characterName }: PronunciationQuizProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>("ready");
  const [correctCount, setCorrectCount] = useState(0);
  const [spokenText, setSpokenText] = useState("");
  const [started, setStarted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const userStoppedRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in (window as any) || "webkitSpeechRecognition" in (window as any));

  const currentWord = words[currentIndex];

  const hearWord = useCallback(() => {
    if (!currentWord) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(currentWord.word);
    u.rate = 0.8;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  }, [currentWord]);

  const startListening = useCallback(() => {
    if (!speechRecognitionSupported) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Abort any prior instance to avoid InvalidStateError
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }

    userStoppedRef.current = false;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: { results: { 0: { transcript: string } }[] }) => {
      if (userStoppedRef.current) return;
      const spoken = event.results[0][0].transcript;
      setSpokenText(spoken);

      const isCorrect = normalize(spoken) === normalize(currentWord.word);
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        setQuizState("correct");
      } else {
        setQuizState("incorrect");
      }
    };

    recognition.onerror = () => {
      if (userStoppedRef.current) return;
      setQuizState("ready");
    };
    recognition.onend = () => {
      if (userStoppedRef.current) {
        setQuizState("ready");
        return;
      }
      // If still listening state and no result came, reset
      setQuizState((prev) => (prev === "listening" ? "ready" : prev));
    };

    recognitionRef.current = recognition;
    setQuizState("listening");
    setSpokenText("");
    try { recognition.start(); } catch { /* noop */ }
  }, [speechRecognitionSupported, currentWord]);

  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    setQuizState("ready");
    setSpokenText("");
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
  }, []);

  const nextWord = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= words.length) {
      const finalCorrect = quizState === "correct" ? correctCount : correctCount;
      setQuizState("complete");
      onComplete(finalCorrect, words.length);
    } else {
      setCurrentIndex(next);
      setQuizState("ready");
      setSpokenText("");
    }
  }, [currentIndex, words.length, quizState, correctCount, onComplete]);

  const retry = useCallback(() => {
    setQuizState("ready");
    setSpokenText("");
  }, []);

  if (!speechRecognitionSupported) return null;
  if (words.length === 0) return null;

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full mb-4"
      >
        <button
          onClick={() => setStarted(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-foreground font-semibold text-sm hover:from-primary/30 hover:to-accent/30 transition-all"
        >
          <Mic className="w-4 h-4 text-primary" />
          Pronunciation Quiz — Earn Bonus XP!
          <Star className="w-4 h-4 text-yellow" />
        </button>
      </motion.div>
    );
  }

  if (quizState === "complete") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-5 text-center"
      >
        <Trophy className="w-10 h-10 text-yellow mx-auto mb-2" />
        <h3 className="text-lg font-bold text-foreground mb-1">Quiz Complete!</h3>
        <p className="text-sm text-muted-foreground mb-3">
          You got <span className="font-bold text-primary">{correctCount}</span> out of{" "}
          <span className="font-bold">{words.length}</span> correct!
        </p>
        <div className="flex gap-1 justify-center mb-3">
          {words.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i < correctCount ? "bg-green" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          +{correctCount * 10} bonus XP earned! 🎉
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 rounded-2xl bg-card border border-border p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Pronunciation Quiz</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-4">
        {words.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < currentIndex
                ? "bg-green"
                : i === currentIndex
                ? "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Current word */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="text-center mb-4"
        >
          <p className="text-xs text-muted-foreground mb-1">Say this word:</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-bold text-foreground">{currentWord.word}</p>
            <button onClick={hearWord} className="text-primary hover:text-primary/80">
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          {currentWord.context && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{currentWord.context}"</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {quizState === "correct" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-3 py-2 rounded-xl bg-green/10 border border-green/20"
          >
            <p className="text-sm font-semibold text-green">✨ Perfect! +10 XP</p>
            <p className="text-xs text-muted-foreground">You said: "{spokenText}"</p>
          </motion.div>
        )}
        {quizState === "incorrect" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20"
          >
            <p className="text-sm font-semibold text-destructive">Not quite!</p>
            <p className="text-xs text-muted-foreground">You said: "{spokenText}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center">
        {quizState === "ready" && (
          <Button onClick={startListening} className="rounded-full gap-2">
            <Mic className="w-4 h-4" />
            Speak Now
          </Button>
        )}
        {quizState === "listening" && (
          <Button onClick={stopListening} variant="destructive" className="rounded-full gap-2">
            <MicOff className="w-4 h-4" />
            Stop
          </Button>
        )}
        {quizState === "incorrect" && (
          <div className="flex gap-2">
            <Button onClick={retry} variant="outline" className="rounded-full gap-2">
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
            <Button onClick={nextWord} variant="ghost" className="rounded-full gap-2">
              Skip
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        {quizState === "correct" && (
          <Button onClick={nextWord} className="rounded-full gap-2">
            {currentIndex + 1 >= words.length ? "Finish" : "Next Word"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default PronunciationQuiz;
