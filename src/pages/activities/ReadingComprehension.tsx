import { useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Star, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProgress } from "@/hooks/useProgress";
import { useUserId } from "@/hooks/useUserId";
import { supabase } from "@/integrations/supabase/client";
import { queuePendingScore } from "@/lib/offlineSync";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Passage {
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  text: string;
  questions: Question[];
}

const passages: Passage[] = [
  {
    title: "The Helpful Dog",
    difficulty: "Beginner",
    text: "Max is a big brown dog. He lives with a family on a farm. Every morning, Max wakes up early. He helps the farmer bring the sheep back to the barn. The sheep follow Max because he is gentle and kind. After work, Max likes to play with the children. They throw a ball and Max brings it back. Everyone on the farm loves Max.",
    questions: [
      { question: "What colour is Max?", options: ["Black", "White", "Brown", "Grey"], correct: 2, explanation: "The passage says Max is a 'big brown dog'." },
      { question: "Where does Max live?", options: ["In a city", "On a farm", "By the sea", "In the forest"], correct: 1, explanation: "The passage says he 'lives with a family on a farm'." },
      { question: "What does Max help with?", options: ["Cooking food", "Cleaning the house", "Bringing sheep to the barn", "Planting flowers"], correct: 2, explanation: "Max 'helps the farmer bring the sheep back to the barn'." },
    ],
  },
  {
    title: "The Library Visit",
    difficulty: "Beginner",
    text: "Mia went to the library with her mother. She wanted to find a book about dinosaurs. The librarian showed her a big shelf full of colourful books. Mia picked a book with a picture of a T-Rex on the cover. She sat in a cosy corner and started reading. She learned that some dinosaurs were as tall as buildings! Mia was so excited that she borrowed two more books to read at home.",
    questions: [
      { question: "Who did Mia go to the library with?", options: ["Her father", "Her friend", "Her mother", "Her teacher"], correct: 2, explanation: "Mia went 'with her mother'." },
      { question: "What kind of book did Mia want?", options: ["A fairy tale", "A book about space", "A book about dinosaurs", "A cook book"], correct: 2, explanation: "She wanted 'a book about dinosaurs'." },
      { question: "How many extra books did Mia borrow?", options: ["One", "Two", "Three", "None"], correct: 1, explanation: "She 'borrowed two more books to read at home'." },
    ],
  },
  {
    title: "The School Garden",
    difficulty: "Intermediate",
    text: "The students in Class 4B decided to create a garden at their school. Their teacher, Mr. Park, helped them plan it. First, they chose a sunny spot near the playground. Then, they dug the soil and added fertiliser to make it rich. Each student planted different seeds — tomatoes, sunflowers, carrots, and lettuce. They took turns watering the plants every day. After six weeks, tiny green shoots appeared. By the end of the term, the garden was full of vegetables and bright yellow sunflowers. The class was so proud that they invited the whole school to see it.",
    questions: [
      { question: "Why did they choose a sunny spot?", options: ["It was near the door", "Plants need sunlight to grow", "It was the only empty space", "The teacher told them to"], correct: 1, explanation: "Plants need sunlight, so choosing a sunny spot makes sense for a garden." },
      { question: "What did the students add to the soil?", options: ["Water only", "Sand", "Fertiliser", "Rocks"], correct: 2, explanation: "They 'added fertiliser to make it rich'." },
      { question: "How long did it take for shoots to appear?", options: ["Two weeks", "Four weeks", "Six weeks", "Eight weeks"], correct: 2, explanation: "'After six weeks, tiny green shoots appeared.'" },
      { question: "What colour were the sunflowers?", options: ["Red", "White", "Orange", "Yellow"], correct: 3, explanation: "The passage mentions 'bright yellow sunflowers'." },
    ],
  },
  {
    title: "Ocean Explorers",
    difficulty: "Intermediate",
    text: "The ocean covers more than seventy per cent of Earth's surface, yet humans have explored less than five per cent of it. Deep beneath the waves, strange creatures live in total darkness. Some fish produce their own light — a trick called bioluminescence. The anglerfish, for example, has a glowing lure on its head to attract prey. Scientists use special submarines called submersibles to study these deep-sea animals. Every expedition brings new discoveries, and researchers believe there are still thousands of unknown species waiting to be found.",
    questions: [
      { question: "How much of the ocean have humans explored?", options: ["Less than 5%", "About 25%", "More than 50%", "Nearly 70%"], correct: 0, explanation: "'Humans have explored less than five per cent of it.'" },
      { question: "What is bioluminescence?", options: ["A type of wave", "Producing your own light", "A deep-sea plant", "A kind of submarine"], correct: 1, explanation: "'Some fish produce their own light — a trick called bioluminescence.'" },
      { question: "How does the anglerfish catch prey?", options: ["With sharp teeth", "By swimming fast", "With a glowing lure", "By hiding in sand"], correct: 2, explanation: "The anglerfish 'has a glowing lure on its head to attract prey'." },
    ],
  },
  {
    title: "The Invention of the Telephone",
    difficulty: "Advanced",
    text: "In 1876, Alexander Graham Bell made one of the most important inventions in history — the telephone. Before the telephone, people communicated over long distances by sending letters or using the telegraph, which transmitted messages in Morse code. Bell, who was a teacher of deaf students, became fascinated with the idea of transmitting the human voice through electrical wires. After years of experimentation, he successfully made the first telephone call to his assistant, Thomas Watson, saying the now-famous words: 'Mr. Watson, come here — I want to see you.' The telephone revolutionised communication, connecting people across cities and eventually across the world. Today, billions of people carry powerful phones in their pockets that can do far more than Bell ever imagined.",
    questions: [
      { question: "When was the telephone invented?", options: ["1856", "1866", "1876", "1886"], correct: 2, explanation: "'In 1876, Alexander Graham Bell made one of the most important inventions.'" },
      { question: "What was Bell's profession?", options: ["An engineer", "A doctor", "A teacher of deaf students", "A scientist"], correct: 2, explanation: "Bell 'was a teacher of deaf students'." },
      { question: "Who did Bell make the first phone call to?", options: ["His wife", "His mother", "The president", "Thomas Watson"], correct: 3, explanation: "He called 'his assistant, Thomas Watson'." },
      { question: "What did people use before the telephone for long-distance messages?", options: ["Email and fax", "Letters and telegraph", "Radio and TV", "Smoke signals"], correct: 1, explanation: "'People communicated over long distances by sending letters or using the telegraph.'" },
    ],
  },
];

const difficultyColors: Record<string, string> = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Advanced: "bg-red-100 text-red-700",
};

const ReadingComprehension = () => {
  const navigate = useNavigate();
  const { addXP } = useProgress();
  const userId = useUserId();

  const [currentPassage, setCurrentPassage] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [readingPhase, setReadingPhase] = useState(true); // true = reading, false = questions

  const passage = passages[currentPassage];
  const question = passage.questions[currentQ];
  const isCorrect = selected === question?.correct;
  const totalQuestions = passages.reduce((sum, p) => sum + p.questions.length, 0);
  const answeredSoFar = passages.slice(0, currentPassage).reduce((s, p) => s + p.questions.length, 0) + currentQ + (selected !== null ? 1 : 0);

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === question.correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    setSelected(null);
    if (currentQ + 1 < passage.questions.length) {
      setCurrentQ((q) => q + 1);
    } else if (currentPassage + 1 < passages.length) {
      setCurrentPassage((p) => p + 1);
      setCurrentQ(0);
      setReadingPhase(true);
    } else {
      setShowResult(true);
      const xp = score * 12 + 15;
      addXP(xp);
      if (userId) {
        supabase.from("game_scores").insert({ user_id: userId, game_type: "reading-comprehension", score, max_score: totalQuestions }).then(({ error }) => {
          if (error) queuePendingScore(userId, "reading-comprehension", score, totalQuestions);
        });
      }
    }
  };

  const restart = () => {
    setCurrentPassage(0);
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setShowResult(false);
    setReadingPhase(true);
  };

  if (showResult) {
    const xp = score * 12 + 15;
    const pct = Math.round((score / totalQuestions) * 100);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4">
          <Star className="w-16 h-16 text-yellow-400 mx-auto" fill="currentColor" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Great Reading!</h2>
        <p className="text-muted-foreground mb-1">You got {score} out of {totalQuestions} correct ({pct}%)</p>
        <p className="text-primary font-semibold mb-6">+{xp} XP earned!</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/learn")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <Button onClick={restart}><RotateCcw className="w-4 h-4 mr-1" /> Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/learn")}><ArrowLeft className="w-5 h-5" /></Button>
        <BookOpen className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg flex-1">Reading Comprehension</h1>
        <span className="text-sm font-medium text-muted-foreground">{score} pts</span>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {/* Progress */}
        <Progress value={(answeredSoFar / totalQuestions) * 100} className="h-2" />

        {/* Passage card */}
        <div className="bg-card rounded-2xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">{passage.title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[passage.difficulty]}`}>{passage.difficulty}</span>
          </div>

          <AnimatePresence mode="wait">
            {readingPhase ? (
              <motion.div key="reading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{passage.text}</p>
                <Button className="mt-4 w-full" onClick={() => setReadingPhase(false)}>
                  I'm done reading — Start Questions
                </Button>
              </motion.div>
            ) : (
              <motion.div key={`q-${currentPassage}-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <p className="text-xs text-muted-foreground">Question {currentQ + 1} of {passage.questions.length}</p>
                <p className="font-semibold">{question.question}</p>

                <div className="space-y-2">
                  {question.options.map((opt, i) => {
                    let cls = "border-border bg-card hover:bg-accent/40";
                    if (selected !== null) {
                      if (i === question.correct) cls = "border-green-400 bg-green-50 dark:bg-green-900/20";
                      else if (i === selected) cls = "border-red-400 bg-red-50 dark:bg-red-900/20";
                    }
                    return (
                      <button key={i} onClick={() => handleSelect(i)} disabled={selected !== null} className={`w-full text-left p-3 rounded-xl border-2 text-sm transition-all ${cls}`}>
                        <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                        {selected !== null && i === question.correct && <CheckCircle2 className="inline w-4 h-4 ml-2 text-green-600" />}
                        {selected === i && !isCorrect && <XCircle className="inline w-4 h-4 ml-2 text-red-500" />}
                      </button>
                    );
                  })}
                </div>

                {selected !== null && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl text-sm ${isCorrect ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"}`}>
                    <p className="font-semibold mb-1">{isCorrect ? "✅ Correct!" : "❌ Not quite."}</p>
                    <p>{question.explanation}</p>
                  </motion.div>
                )}

                {selected !== null && (
                  <Button className="w-full" onClick={handleNext}>Next →</Button>
                )}

                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setReadingPhase(true)}>
                  Re-read the passage
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ReadingComprehension;
