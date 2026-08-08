import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, RotateCcw, Check, X, Sparkles, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserId } from "@/hooks/useUserId";
import { useProgress } from "@/hooks/useProgress";
import { supabase } from "@/integrations/supabase/client";

interface Flashcard {
  id: string;
  word: string;
  definition: string;
  example_sentence: string | null;
  difficulty: number;
  next_review_at: string;
  review_count: number;
  correct_count: number;
}

const Flashcards = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userId = useUserId();
  const { addXP } = useProgress();
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newExample, setNewExample] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Default flashcards for new users or offline fallback
  const defaultCards: Flashcard[] = [
    { id: "default-1", word: "Happy", definition: "Feeling or showing pleasure or joy", example_sentence: "She was so happy to see her friends.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-2", word: "Brave", definition: "Ready to face danger or pain", example_sentence: "The brave firefighter saved the cat.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-3", word: "Curious", definition: "Eager to learn or know something", example_sentence: "The curious child asked many questions.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-4", word: "Gentle", definition: "Mild, kind, or tender", example_sentence: "Be gentle with the baby bird.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-5", word: "Delicious", definition: "Very pleasant to taste", example_sentence: "The pizza was absolutely delicious!", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-6", word: "Adventure", definition: "An exciting or unusual experience", example_sentence: "Climbing the mountain was a great adventure.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-7", word: "Generous", definition: "Willing to give and share freely", example_sentence: "She is very generous with her toys.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-8", word: "Mighty", definition: "Very strong or powerful", example_sentence: "The mighty lion roared loudly.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-9", word: "Sparkle", definition: "To shine brightly with little flashes of light", example_sentence: "The stars sparkle in the night sky.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-10", word: "Whisper", definition: "To speak very softly", example_sentence: "She whispered the secret in my ear.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-11", word: "Enormous", definition: "Extremely large in size", example_sentence: "The elephant was absolutely enormous.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-12", word: "Tiny", definition: "Very small", example_sentence: "A tiny ant crawled across the leaf.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-13", word: "Clever", definition: "Quick to understand or learn", example_sentence: "The clever fox tricked the crow.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-14", word: "Polite", definition: "Showing good manners and respect", example_sentence: "It is polite to say thank you.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-15", word: "Excited", definition: "Very enthusiastic and eager", example_sentence: "I am excited about the trip tomorrow!", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-16", word: "Calm", definition: "Peaceful and not nervous or upset", example_sentence: "The lake looked calm at sunset.", difficulty: 1, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-17", word: "Journey", definition: "An act of traveling from one place to another", example_sentence: "Our journey across the country took two days.", difficulty: 2, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-18", word: "Brilliant", definition: "Exceptionally clever or talented", example_sentence: "She had a brilliant idea for the project.", difficulty: 2, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-19", word: "Mysterious", definition: "Difficult or impossible to understand", example_sentence: "A mysterious door appeared in the wall.", difficulty: 2, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
    { id: "default-20", word: "Brilliant", definition: "Very bright and shining", example_sentence: "The sun was brilliant in the clear sky.", difficulty: 2, next_review_at: new Date().toISOString(), review_count: 0, correct_count: 0 },
  ];

  const fetchFlashcards = useCallback(async () => {
    if (!userId) return;
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("user_id", userId)
        .order("next_review_at", { ascending: true });

      if (fetchError) throw fetchError;

      const cards = data && data.length > 0 ? data : [];
      setFlashcards(cards);
      const now = new Date().toISOString();
      setDueCards(cards.filter(card => card.next_review_at <= now));
      setIsOffline(false);
    } catch (err) {
      console.error("Error fetching flashcards:", err);
      // Fallback to default cards offline
      setFlashcards(defaultCards);
      setDueCards(defaultCards);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  const addFlashcard = async () => {
    if (!userId || !newWord.trim() || !newDefinition.trim()) return;

    try {
      const { error } = await supabase.from("flashcards").insert({
        user_id: userId,
        word: newWord.trim(),
        definition: newDefinition.trim(),
        example_sentence: newExample.trim() || null,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Could not save flashcard:", err);
    }

    toast({ title: "Flashcard added! 📚", description: `"${newWord}" is now in your deck.` });
    setNewWord("");
    setNewDefinition("");
    setNewExample("");
    setDialogOpen(false);
    fetchFlashcards();
  };

  const deleteFlashcard = async (id: string) => {
    // Remove locally first
    setFlashcards(prev => prev.filter(c => c.id !== id));
    setDueCards(prev => prev.filter(c => c.id !== id));

    try {
      await supabase.from("flashcards").delete().eq("id", id);
    } catch (err) {
      console.error("Could not delete flashcard:", err);
    }
    toast({ title: "Card deleted", description: "Flashcard removed from your deck." });
  };

  const handleReview = async (correct: boolean) => {
    if (dueCards.length === 0) return;
    const card = dueCards[currentCardIndex];

    // Enhanced SM-2 spaced repetition
    let newDifficulty: number;
    let intervalMinutes: number;

    if (correct) {
      newDifficulty = Math.min(card.difficulty + 1, 5);
      // Exponential intervals: 1d, 3d, 7d, 14d, 30d
      const dayIntervals = [1, 3, 7, 14, 30];
      intervalMinutes = dayIntervals[newDifficulty - 1] * 24 * 60;
    } else {
      // Wrong: reset difficulty, re-show in this session (1 min) 
      newDifficulty = 1;
      intervalMinutes = 1; // 1 minute — will reappear at end of queue
    }

    const nextReview = new Date();
    nextReview.setMinutes(nextReview.getMinutes() + intervalMinutes);

    const updatedCard = {
      ...card,
      difficulty: newDifficulty,
      next_review_at: nextReview.toISOString(),
      review_count: card.review_count + 1,
      correct_count: card.correct_count + (correct ? 1 : 0),
    };

    // Save to DB
    if (!isOffline) {
      try {
        await supabase
          .from("flashcards")
          .update({
            difficulty: newDifficulty,
            next_review_at: nextReview.toISOString(),
            review_count: updatedCard.review_count,
            correct_count: updatedCard.correct_count,
          })
          .eq("id", card.id);
      } catch (err) {
        console.error("Could not save review:", err);
      }
    }

    if (correct) {
      await addXP(5);
      toast({ title: "Correct! ✨", description: "+5 XP earned!" });
    } else {
      toast({ title: "Keep trying! 💪", description: "This card will come back again soon." });
    }

    setIsFlipped(false);

    if (!correct) {
      // Re-queue wrong card at end of the session
      setDueCards(prev => {
        const updated = [...prev];
        updated.splice(currentCardIndex, 1);
        updated.push(updatedCard);
        return updated;
      });
      // Stay at same index (next card slides in)
      if (currentCardIndex >= dueCards.length - 1) {
        setCurrentCardIndex(0);
      }
    } else if (currentCardIndex < dueCards.length - 1) {
      setDueCards(prev => prev.filter((_, i) => i !== currentCardIndex));
      // Stay at same index since we removed current
    } else {
      // Last card and correct — session done
      setDueCards(prev => prev.filter((_, i) => i !== currentCardIndex));
      setCurrentCardIndex(0);
      toast({ title: "Session Complete! 🎉", description: "All due cards reviewed!" });
      fetchFlashcards();
    }
  };

  const currentCard = dueCards[currentCardIndex];

  const addDefaultCards = async () => {
    if (!userId) return;
    
    for (const card of defaultCards) {
      try {
        await supabase.from("flashcards").insert({
          user_id: userId,
          word: card.word,
          definition: card.definition,
          example_sentence: card.example_sentence,
        });
      } catch (err) {
        console.error("Could not save default card:", err);
      }
    }
    toast({ title: "Starter deck added! 🎴", description: "5 flashcards ready to review." });
    fetchFlashcards();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Flashcards"
        showBack
        icon={<BookOpen className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {isOffline && (
          <div className="bg-[hsl(var(--yellow))]/20 border border-[hsl(var(--yellow))] rounded-xl p-3 mb-4 text-sm text-foreground">
            ⚡ Playing offline — using practice cards, progress won't be saved
          </div>
        )}
        <Tabs defaultValue="review" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="review">Review ({dueCards.length})</TabsTrigger>
            <TabsTrigger value="all">All Cards ({flashcards.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="review">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-3 text-sm">Loading flashcards...</p>
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => { setLoading(true); fetchFlashcards(); }}>
                  Try Again
                </Button>
              </motion.div>
            ) : dueCards.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Sparkles className="w-16 h-16 mx-auto text-[hsl(var(--yellow))] mb-4" />
                <h2 className="font-bold text-foreground text-xl mb-2">All caught up! 🎉</h2>
                <p className="text-muted-foreground mb-6">
                  {flashcards.length === 0 
                    ? "Add some flashcards to start learning!"
                    : "No cards due for review. Check back later!"}
                </p>
                {flashcards.length === 0 && (
                  <Button onClick={addDefaultCards} className="card-turquoise text-white">
                    Add Starter Deck
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{currentCardIndex + 1} / {dueCards.length}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${((currentCardIndex + 1) / dueCards.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Flashcard */}
                <div 
                  className="perspective-1000 cursor-pointer"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isFlipped ? "back" : "front"}
                      initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`min-h-[250px] rounded-2xl shadow-card p-6 flex flex-col items-center justify-center ${
                        isFlipped ? "bg-[hsl(var(--green))] text-primary-foreground" : "card-purple text-white"
                      }`}
                    >
                      {!isFlipped ? (
                        <>
                          <p className="text-sm opacity-80 mb-2">Tap to reveal</p>
                          <h2 className="text-3xl font-bold text-center">{currentCard?.word}</h2>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold text-lg mb-2">{currentCard?.word}</h3>
                          <p className="text-center text-lg mb-4">{currentCard?.definition}</p>
                          {currentCard?.example_sentence && (
                            <p className="text-sm opacity-90 italic text-center">
                              "{currentCard.example_sentence}"
                            </p>
                          )}
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Review buttons */}
                {isFlipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <Button
                      onClick={() => handleReview(false)}
                      variant="outline"
                      className="flex-1 h-14 text-lg border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Again
                    </Button>
                    <Button
                      onClick={() => handleReview(true)}
                      className="flex-1 h-14 text-lg bg-[hsl(var(--green))] hover:bg-[hsl(var(--green))]/90"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Got it!
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-3">
              {/* Add card button */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full card-turquoise text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Flashcard
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Flashcard</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Word</label>
                      <Input
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                        placeholder="e.g., Curious"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Definition</label>
                      <Textarea
                        value={newDefinition}
                        onChange={(e) => setNewDefinition(e.target.value)}
                        placeholder="What does it mean?"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Example Sentence (optional)</label>
                      <Input
                        value={newExample}
                        onChange={(e) => setNewExample(e.target.value)}
                        placeholder="Use it in a sentence"
                      />
                    </div>
                    <Button onClick={addFlashcard} className="w-full">
                      Add Flashcard
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {flashcards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No flashcards yet. Add some to start learning!</p>
                </div>
              ) : (
                flashcards.map((card) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-card rounded-xl shadow-card p-4 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{card.word}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{card.definition}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Reviews: {card.review_count}</span>
                        <span>Correct: {card.correct_count}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteFlashcard(card.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Flashcards;
