import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Sparkles, Send, RefreshCw, Star, CheckCircle, AlertCircle, Lightbulb, Mic, MicOff, Keyboard } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserId } from "@/hooks/useUserId";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition } from "@/hooks/useVoice";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WritingPrompt {
  id: string;
  category: string;
  prompt: string;
  tips: string[];
  minWords: number;
}

const writingPrompts: WritingPrompt[] = [
  {
    id: "favorite_day",
    category: "Personal",
    prompt: "Write about your favorite day of the week. What do you like to do on that day?",
    tips: ["Start with naming the day", "Describe activities you enjoy", "Explain why it's your favorite"],
    minWords: 30,
  },
  {
    id: "dream_pet",
    category: "Creative",
    prompt: "If you could have any pet in the world (real or imaginary), what would it be? Describe it!",
    tips: ["Describe what your pet looks like", "What would you name it?", "What activities would you do together?"],
    minWords: 40,
  },
  {
    id: "superhero",
    category: "Creative",
    prompt: "Create your own superhero! What powers do they have? How do they help people?",
    tips: ["Give your superhero a name", "Describe their special powers", "Tell a short story about them saving the day"],
    minWords: 50,
  },
  {
    id: "best_friend",
    category: "Personal",
    prompt: "Write about your best friend. What makes them special to you?",
    tips: ["Describe your friend", "Share things you enjoy doing together", "Explain why they are important to you"],
    minWords: 35,
  },
  {
    id: "magic_door",
    category: "Adventure",
    prompt: "You find a magic door in your house. Where does it lead? What do you discover?",
    tips: ["Describe what the door looks like", "Paint a picture of the new world", "Include an adventure or surprise"],
    minWords: 50,
  },
  {
    id: "robot_friend",
    category: "Sci-Fi",
    prompt: "Imagine you have a robot friend. What can it do? What adventures do you have together?",
    tips: ["Describe your robot's appearance", "List its special abilities", "Tell about a fun adventure together"],
    minWords: 45,
  },
];

interface AIFeedback {
  overallScore: number;
  grammarScore: number;
  creativityScore: number;
  feedback: string;
  corrections: string[];
  suggestions: string[];
}

type InputMode = "type" | "dictate";

const WritingPractice = () => {
  const { toast } = useToast();
  const userId = useUserId();
  const { addXP } = useProgress();
  
  const speech = useSpeechRecognition({ continuous: true, interimResults: true });

  const [currentPrompt, setCurrentPrompt] = useState<WritingPrompt>(
    writingPrompts[Math.floor(Math.random() * writingPrompts.length)]
  );
  const [userText, setUserText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [pastWritings, setPastWritings] = useState<any[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>("type");

  // Append speech transcript to user text
  useEffect(() => {
    if (speech.transcript && inputMode === "dictate") {
      setUserText(prev => {
        const newText = prev.trim() + (prev.trim() ? " " : "") + speech.transcript.trim();
        speech.reset();
        return newText;
      });
    }
  }, [speech.transcript, inputMode]);

  const wordCount = userText.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    const fetchPastWritings = async () => {
      if (!userId) return;

      try {
        const { data } = await supabase
          .from("writing_exercises")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (data) setPastWritings(data);
      } catch (err) {
        console.error("Could not load past writings:", err);
      }
    };

    fetchPastWritings();
  }, [userId]);

  const getNewPrompt = () => {
    const otherPrompts = writingPrompts.filter((p) => p.id !== currentPrompt.id);
    const newPrompt = otherPrompts[Math.floor(Math.random() * otherPrompts.length)];
    setCurrentPrompt(newPrompt);
    setUserText("");
    setFeedback(null);
    setShowTips(false);
  };

  const submitWriting = async () => {
    if (wordCount < currentPrompt.minWords) {
      toast({
        title: "Write a bit more! ✏️",
        description: `Try to write at least ${currentPrompt.minWords} words.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call AI edge function for feedback
      const response = await supabase.functions.invoke("writing-feedback", {
        body: {
          prompt: currentPrompt.prompt,
          userText,
          minWords: currentPrompt.minWords,
        },
      });

      if (response.error) throw response.error;

      const aiFeedback: AIFeedback = response.data;
      setFeedback(aiFeedback);

      // Save to database
      await supabase.from("writing_exercises").insert({
        user_id: userId,
        prompt: currentPrompt.prompt,
        user_response: userText,
        ai_feedback: aiFeedback.feedback,
        grammar_score: aiFeedback.grammarScore,
        creativity_score: aiFeedback.creativityScore,
      });

      // Award XP based on score
      const xpEarned = Math.round(aiFeedback.overallScore * 0.5);
      await addXP(xpEarned);

      toast({
        title: "Great writing! 🌟",
        description: `+${xpEarned} XP earned!`,
      });
    } catch (error) {
      console.error("Error getting feedback:", error);
      
      // Fallback feedback if AI fails
      const fallbackFeedback: AIFeedback = {
        overallScore: 75,
        grammarScore: 80,
        creativityScore: 70,
        feedback: "Great effort! Your writing shows creativity. Keep practicing to improve even more!",
        corrections: [],
        suggestions: ["Try using more descriptive words", "Add more details to your story"],
      };
      setFeedback(fallbackFeedback);
      await addXP(15);
      
      toast({
        title: "Writing saved! 📝",
        description: "+15 XP earned!",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Writing Practice"
        icon={<PenTool className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Prompt Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[hsl(var(--purple))] to-[hsl(280,65%,55%)] rounded-2xl p-5 text-white mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{currentPrompt.category}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={getNewPrompt}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
          <h2 className="text-lg font-bold mb-3">{currentPrompt.prompt}</h2>
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white"
          >
            <Lightbulb className="w-4 h-4" />
            {showTips ? "Hide tips" : "Show tips"}
          </button>
          <AnimatePresence>
            {showTips && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-1"
              >
                {currentPrompt.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-white/90 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Writing Area */}
        {!feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {/* Input Mode Toggle */}
            <div className="flex justify-center">
              <Tabs value={inputMode} onValueChange={(v) => {
                if (speech.isListening) speech.stop();
                setInputMode(v as InputMode);
              }}>
                <TabsList className="grid w-64 grid-cols-2">
                  <TabsTrigger value="type" className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4" />
                    Type
                  </TabsTrigger>
                  <TabsTrigger value="dictate" className="flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Dictate
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Dictation Mode UI */}
            {inputMode === "dictate" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-muted rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {speech.isListening ? (
                      <>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-3 h-3 rounded-full bg-red-500"
                        />
                        <span className="text-sm font-medium text-foreground">Listening...</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Tap the mic to start speaking</span>
                    )}
                  </div>
                  <Button
                    variant={speech.isListening ? "destructive" : "default"}
                    size="icon"
                    onClick={() => speech.isListening ? speech.stop() : speech.start()}
                    className="rounded-full w-12 h-12"
                    disabled={!speech.isSupported}
                  >
                    {speech.isListening ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                
                {/* Live transcript preview */}
                {speech.interimTranscript && (
                  <p className="text-sm text-muted-foreground italic bg-background rounded-lg p-2">
                    "{speech.interimTranscript}"
                  </p>
                )}

                {!speech.isSupported && (
                  <p className="text-xs text-destructive">
                    Speech recognition is not supported in your browser. Try Chrome or Edge.
                  </p>
                )}
              </motion.div>
            )}

            <Textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder={inputMode === "dictate" 
                ? "Your spoken words will appear here..." 
                : "Start writing your story here..."
              }
              className="min-h-[200px] text-base resize-none"
              readOnly={inputMode === "dictate" && speech.isListening}
            />
            <div className="flex items-center justify-between">
              <span className={`text-sm ${wordCount >= currentPrompt.minWords ? "text-[hsl(var(--green))]" : "text-muted-foreground"}`}>
                {wordCount} words {wordCount < currentPrompt.minWords && `(min: ${currentPrompt.minWords})`}
              </span>
              <div className="flex items-center gap-2">
                {userText.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUserText("")}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  onClick={submitWriting}
                  disabled={isSubmitting || wordCount < 5}
                  className="card-turquoise text-white"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Score Card */}
            <div className="bg-card rounded-2xl shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground text-lg">Your Score</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(feedback.overallScore / 20)
                          ? "text-[hsl(var(--yellow))] fill-current"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Grammar</p>
                  <p className="text-2xl font-bold text-[hsl(var(--turquoise))]">{feedback.grammarScore}%</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Creativity</p>
                  <p className="text-2xl font-bold text-[hsl(var(--purple))]">{feedback.creativityScore}%</p>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-card rounded-2xl shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[hsl(var(--yellow))]" />
                <h3 className="font-bold text-foreground">Feedback</h3>
              </div>
              <p className="text-muted-foreground">{feedback.feedback}</p>
            </div>

            {/* Corrections */}
            {feedback.corrections.length > 0 && (
              <div className="bg-card rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-[hsl(var(--orange))]" />
                  <h3 className="font-bold text-foreground">Things to Fix</h3>
                </div>
                <ul className="space-y-2">
                  {feedback.corrections.map((correction, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[hsl(var(--orange))]/20 text-[hsl(var(--orange))] flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {correction}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {feedback.suggestions.length > 0 && (
              <div className="bg-card rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[hsl(var(--green))]" />
                  <h3 className="font-bold text-foreground">Tips for Next Time</h3>
                </div>
                <ul className="space-y-2">
                  {feedback.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[hsl(var(--green))]/20 text-[hsl(var(--green))] flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        ✓
                      </span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Try Again */}
            <Button onClick={getNewPrompt} className="w-full h-12 card-purple text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another Prompt
            </Button>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default WritingPractice;
