import { useState, useRef, useEffect, useMemo } from "react";
import { BookOpen, Lightbulb, Sparkles, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { streamChat } from "@/lib/streamChat";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import {
  WORD_DICTIONARY,
  WORD_INDEX,
  CATEGORY_LABEL,
  type WordEntry,
} from "@/data/wordDictionary";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME = {
  en: "Hello! 📚 I'm your word buddy. Type any word or pick a category below. I'll explain it in easy words with a fun example! ✨",
  hi: "नमस्ते! 📚 मैं आपका शब्द दोस्त हूँ। कोई भी शब्द टाइप करें या नीचे से एक श्रेणी चुनें। मैं आसान शब्दों और एक मज़ेदार उदाहरण के साथ समझाऊँगा! ✨",
};

const formatEntry = (e: WordEntry, lang: "en" | "hi"): string => {
  if (lang === "hi") {
    return `${e.emoji} **${e.word}** — ${e.hi}\n\n**अर्थ:** ${e.meaningHi}\n\n**उदाहरण:** ${e.exampleHi}\n_(${e.exampleEn})_`;
  }
  return `${e.emoji} **${e.word}** (${e.hi})\n\n**Meaning:** ${e.meaningEn}\n\n**Example:** ${e.exampleEn}\n_(${e.exampleHi})_`;
};

const WordMeaning = () => {
  const [lang] = useAppLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME[lang] },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [wordsLearned, setWordsLearned] = useState(0);
  const [activeCategory, setActiveCategory] = useState<WordEntry["category"] | "all">("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addXP } = useProgress();

  // Update the greeting whenever the app language switches.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) return [{ role: "assistant", content: WELCOME[lang] }];
      const [first, ...rest] = prev;
      return first.role === "assistant" && (first.content === WELCOME.en || first.content === WELCOME.hi)
        ? [{ role: "assistant", content: WELCOME[lang] }, ...rest]
        : [{ role: "assistant", content: WELCOME[lang] }, ...prev];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredWords = useMemo(
    () =>
      activeCategory === "all"
        ? WORD_DICTIONARY
        : WORD_DICTIONARY.filter((w) => w.category === activeCategory),
    [activeCategory],
  );

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "hi" ? "hi-IN" : "en-US";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* noop */ }
  };

  const rewardXP = async (amount: number) => {
    setWordsLearned((c) => c + 1);
    await addXP(amount);
    toast({
      title: lang === "hi" ? "नया शब्द सीखा! 📚" : "New word learned! 📚",
      description: lang === "hi" ? `शब्दावली बढ़ाने के लिए +${amount} XP!` : `+${amount} XP for expanding your vocabulary!`,
    });
  };

  const handleSend = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const questionText =
      lang === "hi" ? `"${trimmed}" का क्या मतलब है?` : `What does "${trimmed}" mean?`;
    const userMsg: Message = { role: "user", content: questionText };

    // Fast path — known word from dictionary
    const entry = WORD_INDEX[trimmed.toLowerCase()];
    if (entry) {
      const reply = formatEntry(entry, lang);
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: reply }]);
      speak(lang === "hi" ? `${entry.word}. ${entry.exampleHi}` : `${entry.word}. ${entry.exampleEn}`);
      await rewardXP(15);
      return;
    }

    // AI fallback for unknown words
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== WELCOME.en && last.content !== WELCOME.hi) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: [
          ...messages.filter((m) => m.content !== WELCOME.en && m.content !== WELCOME.hi),
          userMsg,
        ],
        activityType: lang === "hi" ? "words_hi" : "words",
        onDelta: updateAssistant,
        onDone: async () => {
          setIsLoading(false);
          await rewardXP(15);
        },
        onError: (error) => {
          toast({
            title: lang === "hi" ? "क्षमा करें!" : "Oops!",
            description: error.message,
            variant: "destructive",
          });
          setIsLoading(false);
        },
      });
    } catch {
      setIsLoading(false);
    }
  };

  const categoryTabs: Array<WordEntry["category"] | "all"> = [
    "all", "feelings", "nature", "people", "action", "school", "food", "adjective",
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title={lang === "hi" ? "शब्द का अर्थ" : "Word Meaning"}
        showBack
        icon={<BookOpen className="w-5 h-5 text-primary" />}
      />

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-2 flex items-center gap-2 bg-purple-light"
      >
        <Lightbulb className="w-4 h-4 text-purple" />
        <span className="text-sm font-medium text-purple-900">
          {lang === "hi"
            ? `आज सीखे गए शब्द: ${wordsLearned}`
            : `Words learned today: ${wordsLearned}`}
        </span>
        <span className="ml-auto text-[10px] text-purple-900/70 font-semibold uppercase">
          {lang === "hi" ? "हिन्दी" : "English"}
        </span>
      </motion.div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            isTyping={isLoading && i === messages.length - 1 && msg.role === "assistant"}
          />
        ))}

        {/* Category tabs + word grid */}
        {messages.length <= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 space-y-3"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <Sparkles className="w-3.5 h-3.5 text-purple shrink-0" />
              {categoryTabs.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                    activeCategory === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground/70 hover:bg-muted/70"
                  }`}
                >
                  {c === "all"
                    ? lang === "hi" ? "सभी" : "All"
                    : CATEGORY_LABEL[c][lang]}
                </button>
              ))}
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {filteredWords.map((w) => (
                  <motion.button
                    key={w.word}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSend(w.word)}
                    disabled={isLoading}
                    className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition text-left disabled:opacity-50"
                  >
                    <span className="text-lg shrink-0">{w.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-foreground truncate">{w.word}</span>
                      <span className="block text-[10px] text-muted-foreground truncate">{w.hi}</span>
                    </span>
                    <Volume2
                      className="w-3.5 h-3.5 text-muted-foreground hover:text-primary shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(lang === "hi" ? w.exampleHi : w.exampleEn);
                      }}
                    />
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder={lang === "hi" ? "कोई शब्द टाइप करें..." : "Type a word to learn..."}
      />
    </div>
  );
};

export default WordMeaning;
