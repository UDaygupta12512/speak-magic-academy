import { BookOpen, Sparkles, RotateCcw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import LearningCard from "@/components/LearningCard";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { trackActivity, resumeLink, getResumeContext } from "@/hooks/useLastActivity";
import { Skeleton } from "@/components/ui/skeleton";
import { usePersonalization, levelIndex, type SkillLevel } from "@/hooks/usePersonalization";

const EMOJIS: Record<string, string> = {
  "Practice Chat": "💬",
  "Roleplay": "🎭",
  "Word Meaning": "📖",
  "Word Games": "🎮",
  "Phonics & Sounds": "🔤",
  "Sentence Builder": "🧩",
  "Flashcards": "🃏",
  "Daily Challenges": "🏆",
  "Writing Practice": "✍️",
  "Pronunciation": "🎤",
  "Vocab Quiz": "❓",
  "Grammar Lessons": "📚",
  "Listening": "👂",
  "Spelling Bee": "🐝",
  "Reading": "📕",
  "Tongue Twisters": "👅",
  "Analytics & Mind Map": "🧠",
};

import practiceChatImage from "@/assets/practice-chat.png";
import roleplayImage from "@/assets/roleplay.png";
import wordMeaningImage from "@/assets/word-meaning.png";
import wordGamesImage from "@/assets/word-games.png";
import phonicsImage from "@/assets/phonics.png";
import sentenceBuilderImage from "@/assets/sentence-builder.png";

interface Activity {
  title: string;
  image: string;
  colorClass: string;
  path: string;
  /** Youngest age this activity suits well. */
  minAge: number;
  /** Skill levels this activity is most useful for. */
  levels: SkillLevel[];
  /** Topics/skills this activity trains — matched against missed topics. */
  topics: string[];
}

const learningActivities: Activity[] = [
  { title: "Practice Chat", image: practiceChatImage, colorClass: "card-turquoise", path: "/activity/chat", minAge: 6, levels: ["beginner", "elementary", "intermediate", "advanced"], topics: ["speaking", "conversation"] },
  { title: "Roleplay", image: roleplayImage, colorClass: "card-orange", path: "/activity/roleplay", minAge: 7, levels: ["elementary", "intermediate", "advanced"], topics: ["speaking", "conversation"] },
  { title: "Word Meaning", image: wordMeaningImage, colorClass: "card-turquoise", path: "/activity/words", minAge: 6, levels: ["beginner", "elementary"], topics: ["vocabulary"] },
  { title: "Word Games", image: wordGamesImage, colorClass: "card-purple", path: "/activity/games", minAge: 6, levels: ["beginner", "elementary", "intermediate"], topics: ["vocabulary", "spelling"] },
  { title: "Phonics & Sounds", image: phonicsImage, colorClass: "card-pink", path: "/activity/phonics", minAge: 6, levels: ["beginner"], topics: ["pronunciation", "phonics"] },
  { title: "Sentence Builder", image: sentenceBuilderImage, colorClass: "card-green", path: "/activity/sentences", minAge: 7, levels: ["elementary", "intermediate"], topics: ["grammar", "sentences"] },
  { title: "Flashcards", image: wordMeaningImage, colorClass: "card-yellow", path: "/activity/flashcards", minAge: 6, levels: ["beginner", "elementary", "intermediate", "advanced"], topics: ["vocabulary"] },
  { title: "Daily Challenges", image: wordGamesImage, colorClass: "card-orange", path: "/activity/daily", minAge: 6, levels: ["beginner", "elementary", "intermediate", "advanced"], topics: ["mixed"] },
  { title: "Writing Practice", image: sentenceBuilderImage, colorClass: "card-purple", path: "/activity/writing", minAge: 9, levels: ["intermediate", "advanced"], topics: ["writing", "grammar"] },
  { title: "Pronunciation", image: phonicsImage, colorClass: "card-turquoise", path: "/activity/pronunciation", minAge: 6, levels: ["beginner", "elementary", "intermediate"], topics: ["pronunciation"] },
  { title: "Vocab Quiz", image: wordGamesImage, colorClass: "card-green", path: "/activity/vocab-quiz", minAge: 7, levels: ["beginner", "elementary", "intermediate", "advanced"], topics: ["vocabulary"] },
  { title: "Grammar Lessons", image: sentenceBuilderImage, colorClass: "card-pink", path: "/activity/grammar", minAge: 8, levels: ["elementary", "intermediate", "advanced"], topics: ["grammar"] },
  { title: "Listening", image: phonicsImage, colorClass: "card-orange", path: "/activity/listening", minAge: 7, levels: ["elementary", "intermediate", "advanced"], topics: ["listening"] },
  { title: "Spelling Bee", image: wordGamesImage, colorClass: "card-yellow", path: "/activity/spelling-bee", minAge: 7, levels: ["elementary", "intermediate", "advanced"], topics: ["spelling"] },
  { title: "Reading", image: sentenceBuilderImage, colorClass: "card-turquoise", path: "/activity/reading", minAge: 8, levels: ["intermediate", "advanced"], topics: ["reading"] },
  { title: "Tongue Twisters", image: phonicsImage, colorClass: "card-pink", path: "/activity/tongue-twisters", minAge: 6, levels: ["beginner", "elementary", "intermediate", "advanced"], topics: ["pronunciation"] },
  { title: "Analytics & Mind Map", image: wordGamesImage, colorClass: "card-purple", path: "/analytics", minAge: 9, levels: ["intermediate", "advanced"], topics: ["review"] },
];

const Learn = () => {
  const navigate = useNavigate();
  const { age, skillLevel, missedTopics, loading } = usePersonalization();

  const open = (activity: Activity) => {
    // Deep link carries any stored lesson context (quiz level/question, comic params).
    const link = resumeLink(activity.path);
    trackActivity(activity.title, link, EMOJIS[activity.title] ?? "📘");
    navigate(link);
  };

  const scored = useMemo(() => {
    const missByTopic = new Map(missedTopics.map((m) => [m.topic.toLowerCase(), m.miss_count]));
    const userLevelIdx = levelIndex(skillLevel);

    return learningActivities
      .map((a) => {
        let score = 0;
        // Age fit
        if (age !== null) score += age >= a.minAge ? 2 : -3;
        // Level fit
        if (a.levels.includes(skillLevel)) score += 3;
        else score -= Math.abs(levelIndex(a.levels[0]) - userLevelIdx);
        // Weak-topic boost from history
        const missBoost = a.topics.reduce((sum, t) => sum + (missByTopic.get(t) ?? 0), 0);
        score += Math.min(missBoost, 6) * 2;
        return { activity: a, score, missBoost };
      })
      .sort((x, y) => y.score - x.score);
  }, [age, skillLevel, missedTopics]);

  const todaysPicks = scored.slice(0, 4);
  const pickTitles = new Set(todaysPicks.map((p) => p.activity.title));
  const rest = learningActivities.filter((a) => !pickTitles.has(a.title));

  const weakTopics = missedTopics.slice(0, 4).map((m) => m.topic);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Learn English"
        icon={<BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />}
      />

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Personalized picks */}
        {loading && (
          <section aria-label="Loading your picks" aria-busy="true" className="mb-6">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-3 w-64 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          </section>
        )}
        {!loading && (

          <section aria-labelledby="todays-picks" className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              <h2 id="todays-picks" className="font-bold text-foreground">
                Today&apos;s picks for you
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Chosen for {age ? `age ${age}, ` : ""}
              {skillLevel} level
              {weakTopics.length > 0 ? ` · practising ${weakTopics.join(", ")}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {todaysPicks.map(({ activity, missBoost }, index) => (
                <div key={activity.title} className="relative">
                  <LearningCard
                    title={activity.title}
                    image={activity.image}
                    colorClass={activity.colorClass}
                    delay={index}
                    onClick={() => open(activity)}
                  />
                  {(missBoost > 0 || getResumeContext(activity.path)) && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow">
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      {getResumeContext(activity.path) ? "Resume" : "Review"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <h2 className="font-bold text-foreground mb-3">All activities</h2>
        <div className="grid grid-cols-2 gap-3">
          {rest.map((activity, index) => (
            <LearningCard
              key={activity.title}
              title={activity.title}
              image={activity.image}
              colorClass={activity.colorClass}
              delay={index}
              onClick={() => open(activity)}
            />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Learn;
