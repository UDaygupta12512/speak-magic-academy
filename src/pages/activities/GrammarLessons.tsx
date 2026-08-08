import { useState } from "react";
import { BookOpenCheck, CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";

interface GrammarExercise {
  instruction: string;
  sentence: string;
  blank: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface GrammarTopic {
  title: string;
  description: string;
  emoji: string;
  colorClass: string;
  exercises: GrammarExercise[];
}

const TOPICS: GrammarTopic[] = [
  {
    title: "Present Tense",
    description: "Learn how to talk about things happening now",
    emoji: "⏰",
    colorClass: "bg-primary/10 border-primary/30",
    exercises: [
      { instruction: "Fill in the blank with the correct verb:", sentence: "She ___ to school every day.", blank: "___", options: ["go", "goes", "going", "gone"], correctIndex: 1, explanation: "With 'she' (third person singular), we add -es to 'go' → 'goes'." },
      { instruction: "Choose the correct form:", sentence: "They ___ football after school.", blank: "___", options: ["plays", "playing", "play", "played"], correctIndex: 2, explanation: "With 'they' (plural), we use the base form 'play'." },
      { instruction: "Pick the right word:", sentence: "I ___ my homework every evening.", blank: "___", options: ["does", "do", "doing", "done"], correctIndex: 1, explanation: "With 'I', we use the base form 'do'." },
      { instruction: "Complete the sentence:", sentence: "The cat ___ on the sofa.", blank: "___", options: ["sit", "sits", "sitting", "sat"], correctIndex: 1, explanation: "With 'the cat' (third person singular), we use 'sits'." },
    ],
  },
  {
    title: "Articles (A, An, The)",
    description: "When to use a, an, and the",
    emoji: "📝",
    colorClass: "bg-secondary/10 border-secondary/30",
    exercises: [
      { instruction: "Choose the correct article:", sentence: "___ sun is very bright today.", blank: "___", options: ["A", "An", "The", "No article"], correctIndex: 2, explanation: "We use 'the' because there is only one sun — it's specific!" },
      { instruction: "Fill in the blank:", sentence: "I saw ___ elephant at the zoo.", blank: "___", options: ["a", "an", "the", "no article"], correctIndex: 1, explanation: "'Elephant' starts with a vowel sound, so we use 'an'." },
      { instruction: "Pick the right article:", sentence: "She is ___ kind person.", blank: "___", options: ["a", "an", "the", "no article"], correctIndex: 0, explanation: "'Kind' starts with a consonant sound, so we use 'a'." },
      { instruction: "Complete:", sentence: "Can you pass me ___ salt?", blank: "___", options: ["a", "an", "the", "no article"], correctIndex: 2, explanation: "We use 'the' when both people know which salt is being talked about." },
    ],
  },
  {
    title: "Prepositions",
    description: "Words that show position and direction",
    emoji: "📍",
    colorClass: "bg-accent/10 border-accent/30",
    exercises: [
      { instruction: "Choose the correct preposition:", sentence: "The book is ___ the table.", blank: "___", options: ["in", "on", "at", "to"], correctIndex: 1, explanation: "We use 'on' for surfaces — the book is on top of the table." },
      { instruction: "Fill in:", sentence: "She arrived ___ the airport.", blank: "___", options: ["in", "on", "at", "to"], correctIndex: 2, explanation: "We use 'at' for specific locations like airports, stations, etc." },
      { instruction: "Pick the right word:", sentence: "The fish is swimming ___ the water.", blank: "___", options: ["in", "on", "at", "to"], correctIndex: 0, explanation: "We use 'in' for being inside something — the fish is inside the water." },
      { instruction: "Complete:", sentence: "We are going ___ the park.", blank: "___", options: ["in", "on", "at", "to"], correctIndex: 3, explanation: "We use 'to' for movement toward a destination." },
    ],
  },
  {
    title: "Past Tense",
    description: "Talking about things that already happened",
    emoji: "⏪",
    colorClass: "bg-pink/10 border-pink/30",
    exercises: [
      { instruction: "Choose the correct past tense:", sentence: "Yesterday, I ___ a delicious cake.", blank: "___", options: ["eat", "eats", "ate", "eating"], correctIndex: 2, explanation: "'Ate' is the past tense of 'eat'. It's an irregular verb!" },
      { instruction: "Fill in the blank:", sentence: "She ___ to the store last night.", blank: "___", options: ["go", "goes", "went", "going"], correctIndex: 2, explanation: "'Went' is the past tense of 'go'. Another irregular verb!" },
      { instruction: "Pick the right form:", sentence: "They ___ a great movie on Saturday.", blank: "___", options: ["watch", "watched", "watching", "watches"], correctIndex: 1, explanation: "'Watched' is the regular past tense — just add -ed!" },
      { instruction: "Complete:", sentence: "He ___ his bicycle to school.", blank: "___", options: ["ride", "rides", "rode", "riding"], correctIndex: 2, explanation: "'Rode' is the past tense of 'ride'." },
    ],
  },
];

const GrammarLessons = () => {
  const { addXP } = useProgress();
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [currentEx, setCurrentEx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);

  const handleAnswer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    const topic = TOPICS[selectedTopic!];
    if (index === topic.exercises[currentEx].correctIndex) {
      setScore((s) => s + 1);
    }
    setTimeout(() => setShowExplanation(true), 400);
  };

  const next = () => {
    const topic = TOPICS[selectedTopic!];
    if (currentEx + 1 >= topic.exercises.length) {
      setComplete(true);
      const earned = score * 15;
      if (earned > 0) addXP(earned);
      toast({ title: "Lesson Complete! 📚", description: `+${earned} XP earned!` });
    } else {
      setCurrentEx((e) => e + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  const reset = () => {
    setSelectedTopic(null);
    setCurrentEx(0);
    setSelected(null);
    setShowExplanation(false);
    setScore(0);
    setComplete(false);
  };

  // Topic selector
  if (selectedTopic === null) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Grammar Lessons" showBack icon={<BookOpenCheck className="w-5 h-5 text-primary" />} />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">Pick a grammar topic to practice!</p>
          {TOPICS.map((topic, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelectedTopic(i)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:shadow-card-hover ${topic.colorClass} bg-card`}
            >
              <span className="text-3xl">{topic.emoji}</span>
              <div className="text-left flex-1">
                <p className="font-bold text-foreground">{topic.title}</p>
                <p className="text-xs text-muted-foreground">{topic.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const topic = TOPICS[selectedTopic];

  // Complete
  if (complete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-4">
          <span className="text-6xl">{topic.emoji}</span>
          <h2 className="text-2xl font-bold text-foreground">Lesson Done!</h2>
          <p className="text-lg text-muted-foreground">
            <span className="text-primary font-bold">{score}/{topic.exercises.length}</span> correct
          </p>
          <p className="text-sm text-yellow font-semibold">+{score * 15} XP earned!</p>
          <Button onClick={reset} className="gap-2 mt-4"><RotateCcw className="w-4 h-4" /> Try Another Topic</Button>
        </motion.div>
      </div>
    );
  }

  const exercise = topic.exercises[currentEx];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={topic.title} showBack icon={<BookOpenCheck className="w-5 h-5 text-primary" />} />

      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Exercise {currentEx + 1}/{topic.exercises.length}</span>
          <span>Score: {score}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${((currentEx + 1) / topic.exercises.length) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={currentEx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <p className="text-sm text-muted-foreground mb-2">{exercise.instruction}</p>
            <div className="bg-card rounded-2xl p-6 border border-border mb-6">
              <p className="text-xl font-bold text-foreground text-center">{exercise.sentence}</p>
            </div>

            <div className="space-y-3">
              {exercise.options.map((opt, i) => {
                const isCorrect = i === exercise.correctIndex;
                const isSelected = selected === i;
                let cls = "border-border bg-card";
                if (selected !== null) {
                  if (isCorrect) cls = "border-green bg-green-light";
                  else if (isSelected) cls = "border-destructive bg-destructive/10";
                }
                return (
                  <motion.button
                    key={i}
                    whileTap={selected === null ? { scale: 0.97 } : {}}
                    onClick={() => handleAnswer(i)}
                    disabled={selected !== null}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${cls} ${selected === null ? "hover:border-primary" : ""}`}
                  >
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 font-medium text-foreground">{opt}</span>
                    {selected !== null && isCorrect && <CheckCircle className="w-5 h-5 text-green" />}
                    {selected !== null && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive" />}
                  </motion.button>
                );
              })}
            </div>

            {showExplanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-primary mb-1">💡 Explanation</p>
                  <p className="text-sm text-foreground">{exercise.explanation}</p>
                </div>
                <div className="text-center">
                  <Button onClick={next} className="gap-2">
                    {currentEx + 1 >= topic.exercises.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GrammarLessons;
