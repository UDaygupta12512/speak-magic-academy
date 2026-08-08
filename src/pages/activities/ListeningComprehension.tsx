import { useState, useCallback } from "react";
import { ArrowLeft, Volume2, CheckCircle2, XCircle, Headphones, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTextToSpeech } from "@/hooks/useVoice";
import { useProgress } from "@/hooks/useProgress";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";

interface ListeningQuestion {
  id: number;
  passage: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const listeningLessons: { title: string; level: string; questions: ListeningQuestion[] }[] = [
  {
    title: "At the Park",
    level: "Beginner",
    questions: [
      {
        id: 1,
        passage: "Tom went to the park with his dog. They played fetch near the big tree. The dog was very happy and wagged its tail.",
        question: "What did Tom do at the park?",
        options: ["He read a book", "He played fetch with his dog", "He went swimming", "He played soccer"],
        correctIndex: 1,
        explanation: "The passage says Tom played fetch with his dog near the big tree.",
      },
      {
        id: 2,
        passage: "Tom went to the park with his dog. They played fetch near the big tree. The dog was very happy and wagged its tail.",
        question: "How did the dog feel?",
        options: ["Sad", "Angry", "Happy", "Tired"],
        correctIndex: 2,
        explanation: "The passage says the dog was very happy and wagged its tail.",
      },
    ],
  },
  {
    title: "Morning Routine",
    level: "Beginner",
    questions: [
      {
        id: 1,
        passage: "Sara wakes up at seven o'clock every morning. She brushes her teeth and eats breakfast. Her favorite breakfast is toast with jam.",
        question: "What time does Sara wake up?",
        options: ["Six o'clock", "Seven o'clock", "Eight o'clock", "Nine o'clock"],
        correctIndex: 1,
        explanation: "The passage says Sara wakes up at seven o'clock every morning.",
      },
      {
        id: 2,
        passage: "Sara wakes up at seven o'clock every morning. She brushes her teeth and eats breakfast. Her favorite breakfast is toast with jam.",
        question: "What is Sara's favorite breakfast?",
        options: ["Cereal", "Eggs", "Toast with jam", "Pancakes"],
        correctIndex: 2,
        explanation: "The passage says her favorite breakfast is toast with jam.",
      },
    ],
  },
  {
    title: "The Weather",
    level: "Intermediate",
    questions: [
      {
        id: 1,
        passage: "Yesterday it rained all day long. The children couldn't go outside to play. Instead, they stayed inside and painted colorful pictures. When the rain stopped in the evening, a beautiful rainbow appeared in the sky.",
        question: "Why couldn't the children go outside?",
        options: ["It was too hot", "It was raining", "It was snowing", "It was dark"],
        correctIndex: 1,
        explanation: "The passage says it rained all day, so the children couldn't go outside.",
      },
      {
        id: 2,
        passage: "Yesterday it rained all day long. The children couldn't go outside to play. Instead, they stayed inside and painted colorful pictures. When the rain stopped in the evening, a beautiful rainbow appeared in the sky.",
        question: "What did the children do inside?",
        options: ["Watched TV", "Played games", "Painted pictures", "Read books"],
        correctIndex: 2,
        explanation: "The passage says they stayed inside and painted colorful pictures.",
      },
      {
        id: 3,
        passage: "Yesterday it rained all day long. The children couldn't go outside to play. Instead, they stayed inside and painted colorful pictures. When the rain stopped in the evening, a beautiful rainbow appeared in the sky.",
        question: "What appeared when the rain stopped?",
        options: ["The sun", "A rainbow", "Stars", "A cloud"],
        correctIndex: 1,
        explanation: "The passage says a beautiful rainbow appeared in the sky.",
      },
    ],
  },
  {
    title: "Shopping Trip",
    level: "Intermediate",
    questions: [
      {
        id: 1,
        passage: "Mom took Lily to the grocery store. They bought apples, milk, and bread. Lily also picked a box of her favorite cookies. At the checkout, Mom paid with her card and Lily helped carry the bags to the car.",
        question: "Where did Mom and Lily go?",
        options: ["The library", "The grocery store", "The park", "The school"],
        correctIndex: 1,
        explanation: "The passage says Mom took Lily to the grocery store.",
      },
      {
        id: 2,
        passage: "Mom took Lily to the grocery store. They bought apples, milk, and bread. Lily also picked a box of her favorite cookies. At the checkout, Mom paid with her card and Lily helped carry the bags to the car.",
        question: "What extra item did Lily pick?",
        options: ["Chocolate", "Ice cream", "Cookies", "Candy"],
        correctIndex: 2,
        explanation: "The passage says Lily picked a box of her favorite cookies.",
      },
    ],
  },
  {
    title: "The School Play",
    level: "Advanced",
    questions: [
      {
        id: 1,
        passage: "The school was putting on a play about a brave knight who rescued a village from a dragon. Emma was chosen to play the knight because she spoke clearly and remembered all her lines during practice. On the night of the performance, the auditorium was packed with parents and friends. Emma felt nervous at first, but once she stepped on stage, she delivered her lines perfectly.",
        question: "Why was Emma chosen for the role?",
        options: [
          "She was the tallest",
          "She spoke clearly and remembered her lines",
          "She had the best costume",
          "Her parents asked the teacher",
        ],
        correctIndex: 1,
        explanation: "The passage says she was chosen because she spoke clearly and remembered all her lines.",
      },
      {
        id: 2,
        passage: "The school was putting on a play about a brave knight who rescued a village from a dragon. Emma was chosen to play the knight because she spoke clearly and remembered all her lines during practice. On the night of the performance, the auditorium was packed with parents and friends. Emma felt nervous at first, but once she stepped on stage, she delivered her lines perfectly.",
        question: "How did Emma feel before going on stage?",
        options: ["Excited", "Angry", "Nervous", "Bored"],
        correctIndex: 2,
        explanation: "The passage says Emma felt nervous at first.",
      },
      {
        id: 3,
        passage: "The school was putting on a play about a brave knight who rescued a village from a dragon. Emma was chosen to play the knight because she spoke clearly and remembered all her lines during practice. On the night of the performance, the auditorium was packed with parents and friends. Emma felt nervous at first, but once she stepped on stage, she delivered her lines perfectly.",
        question: "What was the play about?",
        options: [
          "A princess in a tower",
          "A brave knight and a dragon",
          "A magical forest",
          "A talking animal",
        ],
        correctIndex: 1,
        explanation: "The passage says it was about a brave knight who rescued a village from a dragon.",
      },
    ],
  },
];

const ListeningComprehension = () => {
  const navigate = useNavigate();
  const { addXP } = useProgress();
  const { speak, isSpeaking, stop } = useTextToSpeech({ rate: 0.85, pitch: 1.05 });

  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [listenedOnce, setListenedOnce] = useState(false);

  const lesson = selectedLesson !== null ? listeningLessons[selectedLesson] : null;
  const question = lesson ? lesson.questions[currentQ] : null;

  const handleListen = useCallback(() => {
    if (!question) return;
    stop();
    speak(question.passage);
    setListenedOnce(true);
  }, [question, speak, stop]);

  const handleAnswer = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (question && idx === question.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (!lesson) return;
    stop();
    if (currentQ + 1 < lesson.questions.length) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setShowResult(false);
      setListenedOnce(false);
    } else {
      setFinished(true);
      const earned = score * 15 + 10;
      addXP(earned);
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
    setListenedOnce(false);
    stop();
  };

  const handleBack = () => {
    stop();
    if (selectedLesson !== null && !finished) {
      setSelectedLesson(null);
      handleRestart();
    } else if (finished) {
      setSelectedLesson(null);
      handleRestart();
    } else {
      navigate("/learn");
    }
  };

  // Lesson selector
  if (selectedLesson === null) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary/10 p-4 flex items-center gap-3">
          <button onClick={() => navigate("/learn")} className="text-primary">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Headphones className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Listening Comprehension</h1>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
          <p className="text-muted-foreground text-sm">
            Listen to short passages and answer questions. Tap the speaker to hear the story!
          </p>
          {listeningLessons.map((l, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Card
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/30"
                onClick={() => {
                  setSelectedLesson(idx);
                  handleRestart();
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{l.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {l.level} · {l.questions.length} questions
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      l.level === "Beginner"
                        ? "bg-green-100 text-green-700"
                        : l.level === "Intermediate"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {l.level}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  // Finished screen
  if (finished && lesson) {
    const total = lesson.questions.length;
    const earned = score * 15 + 10;
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary/10 p-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-primary">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Headphones className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Results</h1>
        </div>
        <div className="max-w-lg mx-auto px-4 py-8 text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-6xl">
            {score === total ? "🏆" : score >= total / 2 ? "⭐" : "💪"}
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground">
            {score}/{total} Correct!
          </h2>
          <p className="text-primary font-semibold">+{earned} XP earned</p>
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-1" /> Retry
            </Button>
            <Button onClick={handleBack}>More Lessons</Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!lesson || !question) return null;

  const progressPercent = ((currentQ + (showResult ? 1 : 0)) / lesson.questions.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary/10 p-4 flex items-center gap-3">
        <button onClick={handleBack} className="text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Headphones className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">{lesson.title}</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">
          Question {currentQ + 1} of {lesson.questions.length}
        </p>

        {/* Listen button */}
        <Card className="p-5 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Tap to listen to the passage</p>
          <Button
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={handleListen}
            disabled={isSpeaking}
          >
            <Volume2 className={`w-7 h-7 ${isSpeaking ? "animate-pulse" : ""}`} />
          </Button>
          {isSpeaking && (
            <p className="text-xs text-primary animate-pulse">Playing audio…</p>
          )}
          {listenedOnce && !isSpeaking && (
            <p className="text-xs text-muted-foreground">Tap again to re-listen</p>
          )}
        </Card>

        {/* Question */}
        <AnimatePresence mode="wait">
          {listenedOnce && (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h3 className="font-semibold text-foreground">{question.question}</h3>
              <div className="space-y-2">
                {question.options.map((opt, idx) => {
                  let variant: "outline" | "default" | "destructive" = "outline";
                  let icon = null;
                  if (showResult && idx === question.correctIndex) {
                    variant = "default";
                    icon = <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />;
                  } else if (showResult && idx === selected && idx !== question.correctIndex) {
                    variant = "destructive";
                    icon = <XCircle className="w-4 h-4 ml-auto shrink-0" />;
                  }

                  return (
                    <Button
                      key={idx}
                      variant={variant}
                      className="w-full justify-start text-left h-auto py-3 px-4"
                      onClick={() => handleAnswer(idx)}
                      disabled={showResult}
                    >
                      <span className="mr-2 font-bold text-xs opacity-60">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt}
                      {icon}
                    </Button>
                  );
                })}
              </div>

              {showResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-muted rounded-lg p-3"
                >
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                </motion.div>
              )}

              {showResult && (
                <Button className="w-full" onClick={handleNext}>
                  {currentQ + 1 < lesson.questions.length ? "Next Question" : "See Results"}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
};

export default ListeningComprehension;
