import { localDateKey } from "@/lib/localDate";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Trophy, Zap, CheckCircle2, Clock, Sparkles, Calendar } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUserId } from "@/hooks/useUserId";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/integrations/supabase/client";

interface DailyChallenge {
  id: string;
  challenge_type: string;
  challenge_data: any;
  xp_reward: number;
  completed?: boolean;
}

const challengeTemplates = [
  {
    type: "word_scramble",
    title: "Word Scramble",
    icon: "🔤",
    color: "card-purple",
    generate: () => {
      const words = ["ADVENTURE", "BEAUTIFUL", "CELEBRATE", "DISCOVERY", "ELEPHANT"];
      const word = words[Math.floor(Math.random() * words.length)];
      const scrambled = word.split("").sort(() => Math.random() - 0.5).join("");
      return { word, scrambled, hint: `A ${word.length}-letter word` };
    },
  },
  {
    type: "fill_blank",
    title: "Fill in the Blank",
    icon: "📝",
    color: "card-turquoise",
    generate: () => {
      const sentences = [
        { sentence: "The sun ___ in the east.", answer: "rises", options: ["rises", "sets", "falls", "goes"] },
        { sentence: "Birds fly in the ___.", answer: "sky", options: ["sky", "water", "ground", "tree"] },
        { sentence: "She ___ very fast.", answer: "runs", options: ["runs", "walk", "sleep", "eat"] },
        { sentence: "The ___ is hot in summer.", answer: "weather", options: ["weather", "cloud", "rain", "snow"] },
      ];
      return sentences[Math.floor(Math.random() * sentences.length)];
    },
  },
  {
    type: "synonym_match",
    title: "Synonym Challenge",
    icon: "🎯",
    color: "card-orange",
    generate: () => {
      const pairs = [
        { word: "Happy", synonym: "Joyful", decoys: ["Sad", "Angry", "Tired"] },
        { word: "Big", synonym: "Large", decoys: ["Small", "Tiny", "Short"] },
        { word: "Fast", synonym: "Quick", decoys: ["Slow", "Heavy", "Soft"] },
        { word: "Smart", synonym: "Clever", decoys: ["Dull", "Lazy", "Quiet"] },
      ];
      const pair = pairs[Math.floor(Math.random() * pairs.length)];
      return { ...pair, options: [pair.synonym, ...pair.decoys].sort(() => Math.random() - 0.5) };
    },
  },
  {
    type: "sentence_order",
    title: "Sentence Builder",
    icon: "🏗️",
    color: "card-green",
    generate: () => {
      const sentences = [
        { correct: ["The", "cat", "sat", "on", "the", "mat"], words: ["mat", "The", "sat", "on", "cat", "the"] },
        { correct: ["I", "love", "to", "read", "books"], words: ["books", "I", "read", "love", "to"] },
        { correct: ["She", "plays", "in", "the", "garden"], words: ["garden", "She", "in", "plays", "the"] },
      ];
      return sentences[Math.floor(Math.random() * sentences.length)];
    },
  },
];

const DailyChallenges = () => {
  const { toast } = useToast();
  const userId = useUserId();
  const { addXP } = useProgress();

  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<DailyChallenge | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Generate local challenges as fallback
  const generateLocalChallenges = useCallback((): DailyChallenge[] => {
    return challengeTemplates.map((template, i) => ({
      id: `local-${i}`,
      challenge_type: template.type,
      challenge_data: template.generate(),
      xp_reward: 30 + Math.floor(Math.random() * 20),
      completed: false,
    }));
  }, []);

  const fetchOrCreateChallenges = useCallback(async () => {
    if (!userId) return;
    setError(null);

    try {
      const today = localDateKey();

      // Fetch today's challenges
      let { data: existingChallenges, error: fetchError } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("challenge_date", today);

      if (fetchError) throw fetchError;

      // Challenges are seeded server-side (a year ahead) and the table is
      // read-only for clients, so if today's row is somehow missing we fall
      // back to locally generated puzzles instead of attempting a blocked insert.
      if (!existingChallenges || existingChallenges.length === 0) {
        setChallenges(generateLocalChallenges());
        setIsOffline(true);
        setLoading(false);
        return;
      }


      // Fetch user's progress
      const { data: progress } = await supabase
        .from("user_daily_challenge_progress")
        .select("challenge_id, completed")
        .eq("user_id", userId);

      const progressMap = new Map(progress?.map((p) => [p.challenge_id, p.completed]) || []);

      const challengesWithProgress = (existingChallenges || []).map((c) => ({
        ...c,
        completed: progressMap.get(c.id) || false,
      }));

      setChallenges(challengesWithProgress);
      setIsOffline(false);
    } catch (err) {
      console.error("Error fetching challenges:", err);
      // Fallback to local challenges
      setChallenges(generateLocalChallenges());
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [userId, generateLocalChallenges]);

  useEffect(() => {
    fetchOrCreateChallenges();
  }, [fetchOrCreateChallenges]);

  const startChallenge = (challenge: DailyChallenge) => {
    setActiveChallenge(challenge);
    setUserAnswer("");
    setSelectedOption(null);
    setOrderedWords([]);
  };

  const submitAnswer = async () => {
    if (!activeChallenge || !userId) return;

    let isCorrect = false;
    const data = activeChallenge.challenge_data;

    switch (activeChallenge.challenge_type) {
      case "word_scramble":
        isCorrect = userAnswer.toUpperCase() === data.word;
        break;
      case "fill_blank":
        isCorrect = selectedOption === data.answer;
        break;
      case "synonym_match":
        isCorrect = selectedOption === data.synonym;
        break;
      case "sentence_order":
        isCorrect = orderedWords.join(" ") === data.correct.join(" ");
        break;
    }

    if (isCorrect) {
      // Mark as completed locally
      setChallenges(prev => prev.map(c => 
        c.id === activeChallenge.id ? { ...c, completed: true } : c
      ));

      // Try to save to DB (may fail offline)
      if (!isOffline) {
        try {
          await supabase.from("user_daily_challenge_progress").upsert({
            user_id: userId,
            challenge_id: activeChallenge.id,
            completed: true,
            completed_at: new Date().toISOString(),
          });
          await addXP(activeChallenge.xp_reward);
        } catch (err) {
          console.error("Could not save progress:", err);
        }
      }
      
      toast({
        title: "Challenge Complete! 🎉",
        description: `+${activeChallenge.xp_reward} XP earned!`,
      });

      setActiveChallenge(null);
    } else {
      toast({
        title: "Not quite right 🤔",
        description: "Try again!",
        variant: "destructive",
      });
    }
  };

  const completedCount = challenges.filter((c) => c.completed).length;
  const template = activeChallenge 
    ? challengeTemplates.find((t) => t.type === activeChallenge.challenge_type) 
    : null;

  const handleWordClick = (word: string) => {
    if (orderedWords.includes(word)) {
      setOrderedWords(orderedWords.filter((w) => w !== word));
    } else {
      setOrderedWords([...orderedWords, word]);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Daily Challenges"
        icon={<Target className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {isOffline && (
          <div className="bg-[hsl(var(--yellow))]/20 border border-[hsl(var(--yellow))] rounded-xl p-3 mb-4 text-sm text-foreground">
            ⚡ Playing offline — progress won't be saved
          </div>
        )}
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-[hsl(180,70%,40%)] rounded-2xl p-5 text-primary-foreground mb-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="font-bold text-lg">Today's Challenges</h2>
              <p className="text-sm opacity-90">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 bg-primary-foreground/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-foreground rounded-full transition-all"
                  style={{ width: `${(completedCount / challenges.length) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-bold">{completedCount}/{challenges.length}</span>
          </div>
        </motion.div>

        {/* Active Challenge */}
        <AnimatePresence mode="wait">
          {activeChallenge && template && (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl shadow-card p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{template.icon}</span>
                  <h3 className="font-bold text-foreground">{template.title}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveChallenge(null)}>
                  ✕
                </Button>
              </div>

              {/* Word Scramble */}
              {activeChallenge.challenge_type === "word_scramble" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">Unscramble this word:</p>
                  <p className="text-3xl font-bold text-center tracking-widest text-primary">
                    {activeChallenge.challenge_data.scrambled}
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Hint: {activeChallenge.challenge_data.hint}
                  </p>
                  <Input
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer"
                    className="text-center text-lg"
                  />
                </div>
              )}

              {/* Fill in the Blank */}
              {activeChallenge.challenge_type === "fill_blank" && (
                <div className="space-y-4">
                  <p className="text-lg text-foreground text-center">
                    {activeChallenge.challenge_data.sentence}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeChallenge.challenge_data.options.map((option: string) => (
                      <Button
                        key={option}
                        variant={selectedOption === option ? "default" : "outline"}
                        onClick={() => setSelectedOption(option)}
                        className="h-12"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Synonym Match */}
              {activeChallenge.challenge_type === "synonym_match" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-center">
                    Find the synonym for:
                  </p>
                  <p className="text-2xl font-bold text-center text-primary">
                    {activeChallenge.challenge_data.word}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeChallenge.challenge_data.options.map((option: string) => (
                      <Button
                        key={option}
                        variant={selectedOption === option ? "default" : "outline"}
                        onClick={() => setSelectedOption(option)}
                        className="h-12"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sentence Order */}
              {activeChallenge.challenge_type === "sentence_order" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">Arrange these words into a sentence:</p>
                  <div className="min-h-[50px] p-3 bg-muted rounded-lg flex flex-wrap gap-2">
                    {orderedWords.length === 0 ? (
                      <span className="text-muted-foreground">Tap words to build a sentence...</span>
                    ) : (
                      orderedWords.map((word, i) => (
                        <span
                          key={i}
                          onClick={() => handleWordClick(word)}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded-lg cursor-pointer"
                        >
                          {word}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {activeChallenge.challenge_data.words.map((word: string, i: number) => (
                      <Button
                        key={i}
                        variant="outline"
                        onClick={() => handleWordClick(word)}
                        disabled={orderedWords.includes(word)}
                        className={orderedWords.includes(word) ? "opacity-30" : ""}
                      >
                        {word}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={submitAnswer} className="w-full mt-6 h-12 card-green text-white">
                Submit Answer
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Challenge List */}
        {!activeChallenge && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              </div>
            ) : (
              challenges.map((challenge, index) => {
                const tmpl = challengeTemplates.find((t) => t.type === challenge.challenge_type);
                if (!tmpl) return null;

                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`rounded-2xl shadow-card p-4 flex items-center gap-4 ${
                      challenge.completed ? "bg-muted/50" : "bg-card"
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-xl ${tmpl.color} flex items-center justify-center text-2xl`}>
                      {challenge.completed ? <CheckCircle2 className="w-8 h-8 text-white" /> : tmpl.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{tmpl.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4 text-[hsl(var(--yellow))]" />
                        <span>+{challenge.xp_reward} XP</span>
                      </div>
                    </div>
                    {challenge.completed ? (
                      <span className="text-[hsl(var(--green))] font-semibold">Done!</span>
                    ) : (
                      <Button 
                        onClick={() => startChallenge(challenge)}
                        className="card-turquoise text-white"
                      >
                        Start
                      </Button>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Completed message */}
        {!loading && !activeChallenge && completedCount === challenges.length && challenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-gradient-to-br from-[hsl(var(--yellow))] to-[hsl(var(--orange))] rounded-2xl p-6 text-center"
          >
            <Trophy className="w-16 h-16 mx-auto text-white mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">All Challenges Complete! 🎉</h2>
            <p className="text-white/90">Come back tomorrow for new challenges!</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default DailyChallenges;
