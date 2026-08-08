import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, lazy, Suspense } from "react";
import PageTransition from "./components/PageTransition";
import { trackActivity } from "./hooks/useLastActivity";

const ROUTE_META: Record<string, { label: string; emoji: string }> = {
  "/activity/chat": { label: "Practice Chat", emoji: "💬" },
  "/activity/roleplay": { label: "Roleplay", emoji: "🎭" },
  "/activity/words": { label: "Word Meaning", emoji: "📖" },
  "/activity/games": { label: "Word Games", emoji: "🎮" },
  "/activity/phonics": { label: "Phonics & Sounds", emoji: "🔤" },
  "/activity/sentences": { label: "Sentence Builder", emoji: "🧩" },
  "/activity/flashcards": { label: "Flashcards", emoji: "🃏" },
  "/activity/daily": { label: "Daily Challenges", emoji: "🏆" },
  "/activity/writing": { label: "Writing Practice", emoji: "✍️" },
  "/activity/pronunciation": { label: "Pronunciation", emoji: "🎤" },
  "/activity/vocab-quiz": { label: "Vocab Quiz", emoji: "❓" },
  "/activity/grammar": { label: "Grammar Lessons", emoji: "📚" },
  "/activity/listening": { label: "Listening", emoji: "👂" },
  "/activity/spelling-bee": { label: "Spelling Bee", emoji: "🐝" },
  "/activity/reading": { label: "Reading", emoji: "📕" },
  "/activity/tongue-twisters": { label: "Tongue Twisters", emoji: "👅" },
  "/stories": { label: "Audio Stories", emoji: "🎧" },
  "/call": { label: "AI Call", emoji: "📞" },
  "/comic-book": { label: "Comic Book", emoji: "🎨" },
  "/analytics": { label: "Analytics & Mind Map", emoji: "🧠" },
};
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineBanner from "./components/OfflineBanner";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./hooks/useAuth";
import RouteFallback from "./components/RouteFallback";

// Route-level code splitting: only the home page, auth and the error shell ship
// in the initial bundle. Heavy screens (comic generator, mind-map analytics,
// the AI call pipeline) load on demand.
const Learn = lazy(() => import("./pages/Learn"));
const Stories = lazy(() => import("./pages/Stories"));
const StoryPlayer = lazy(() => import("./pages/StoryPlayer"));
const Call = lazy(() => import("./pages/Call"));
const AICharacterChat = lazy(() => import("./pages/AICharacterChat"));
const Profile = lazy(() => import("./pages/Profile"));
const PracticeChat = lazy(() => import("./pages/activities/PracticeChat"));
const Roleplay = lazy(() => import("./pages/activities/Roleplay"));
const WordMeaning = lazy(() => import("./pages/activities/WordMeaning"));
const WordGames = lazy(() => import("./pages/activities/WordGames"));
const Phonics = lazy(() => import("./pages/activities/Phonics"));
const SentenceBuilder = lazy(() => import("./pages/activities/SentenceBuilder"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Flashcards = lazy(() => import("./pages/activities/Flashcards"));
const DailyChallenges = lazy(() => import("./pages/activities/DailyChallenges"));
const WritingPractice = lazy(() => import("./pages/activities/WritingPractice"));
const PronunciationPractice = lazy(() => import("./pages/activities/PronunciationPractice"));
const VocabQuiz = lazy(() => import("./pages/activities/VocabQuiz"));
const GrammarLessons = lazy(() => import("./pages/activities/GrammarLessons"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const ListeningComprehension = lazy(() => import("./pages/activities/ListeningComprehension"));
const SpellingBee = lazy(() => import("./pages/activities/SpellingBee"));
const ReadingComprehension = lazy(() => import("./pages/activities/ReadingComprehension"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const RewardsShop = lazy(() => import("./pages/RewardsShop"));
const TongueTwisters = lazy(() => import("./pages/activities/TongueTwisters"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const ComicBook = lazy(() => import("./pages/ComicBook"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const Offline = lazy(() => import("./pages/Offline"));
const ServerError = lazy(() => import("./pages/ServerError"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));


const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <PageTransition>{children}</PageTransition>
  </ProtectedRoute>
);

const queryClient = new QueryClient();


const AnimatedRoutes = () => {
  const location = useLocation();

  // Auto-persist last-visited learning route for "Continue Learning"
  useEffect(() => {
    // Match exact route or dynamic pattern (e.g. /call/:id)
    const key = Object.keys(ROUTE_META).find(
      (r) => location.pathname === r || location.pathname.startsWith(r + "/")
    );
    if (key) {
      const meta = ROUTE_META[key];
      // Keep the query string so "Continue Learning" restores lesson context.
      trackActivity(meta.label, location.pathname + location.search, meta.emoji);
    }
  }, [location.pathname, location.search]);


  return (
    // AnimatePresence clones its direct child and attaches a ref, so the child
    // must be a DOM-backed element (motion.div) — passing <Routes> directly
    // triggered "Function components cannot be given refs" on every navigation.
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
      <Suspense fallback={<RouteFallback />}>
      <Routes location={location}>


        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/401" element={<PageTransition><Unauthorized /></PageTransition>} />
        <Route path="/403" element={<PageTransition><Forbidden /></PageTransition>} />
        <Route path="/500" element={<PageTransition><ServerError /></PageTransition>} />
        <Route path="/offline" element={<PageTransition><Offline /></PageTransition>} />

        <Route path="/" element={<Protected><Index /></Protected>} />
        <Route path="/learn" element={<Protected><Learn /></Protected>} />
        <Route path="/stories" element={<Protected><Stories /></Protected>} />
        <Route path="/story/:id" element={<Protected><StoryPlayer /></Protected>} />
        <Route path="/call" element={<Protected><Call /></Protected>} />
        <Route path="/call/:characterId" element={<Protected><AICharacterChat /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/achievements" element={<Protected><Achievements /></Protected>} />
        <Route path="/activity/chat" element={<Protected><PracticeChat /></Protected>} />
        <Route path="/activity/roleplay" element={<Protected><Roleplay /></Protected>} />
        <Route path="/activity/words" element={<Protected><WordMeaning /></Protected>} />
        <Route path="/activity/games" element={<Protected><WordGames /></Protected>} />
        <Route path="/activity/phonics" element={<Protected><Phonics /></Protected>} />
        <Route path="/activity/sentences" element={<Protected><SentenceBuilder /></Protected>} />
        <Route path="/activity/flashcards" element={<Protected><Flashcards /></Protected>} />
        <Route path="/activity/daily" element={<Protected><DailyChallenges /></Protected>} />
        <Route path="/activity/writing" element={<Protected><WritingPractice /></Protected>} />
        <Route path="/activity/pronunciation" element={<Protected><PronunciationPractice /></Protected>} />
        <Route path="/activity/vocab-quiz" element={<Protected><VocabQuiz /></Protected>} />
        <Route path="/activity/grammar" element={<Protected><GrammarLessons /></Protected>} />
        <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
        <Route path="/activity/listening" element={<Protected><ListeningComprehension /></Protected>} />
        <Route path="/activity/spelling-bee" element={<Protected><SpellingBee /></Protected>} />
        <Route path="/activity/reading" element={<Protected><ReadingComprehension /></Protected>} />
        <Route path="/parent" element={<Protected><ParentDashboard /></Protected>} />
        <Route path="/shop" element={<Protected><RewardsShop /></Protected>} />
        <Route path="/activity/tongue-twisters" element={<Protected><TongueTwisters /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/help" element={<Protected><HelpSupport /></Protected>} />
        <Route path="/comic-book" element={<Protected><ComicBook /></Protected>} />
        <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
      </Suspense>

      </motion.div>
    </AnimatePresence>

  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);


export default App;
