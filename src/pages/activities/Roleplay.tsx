import { useState, useRef, useEffect } from "react";
import { Theater, Sparkles, Volume2, VolumeX, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { streamChat } from "@/lib/streamChat";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { speakHQ, primeVoices } from "@/lib/hqSpeech";
import VoiceTestButton from "@/components/VoiceTestButton";

type Message = { role: "user" | "assistant"; content: string };

type Scenario = {
  id: string;
  title: string;
  prompt: string;
  character: string;
  tone: string;
};

// Per-scenario voice tuning for higher-quality, more characterful speech.
type VoiceProfile = { rate: number; pitch: number; voicePreferences: string[] };
const SCENARIO_VOICES: Record<string, VoiceProfile> = {
  restaurant: { rate: 0.98, pitch: 1.1,  voicePreferences: ["Microsoft Guy Online", "Daniel", "Google UK English Male"] },
  store:      { rate: 1.0,  pitch: 1.35, voicePreferences: ["Microsoft Aria Online", "Microsoft Jenny Online", "Samantha", "Karen"] },
  school:     { rate: 1.0,  pitch: 1.45, voicePreferences: ["Microsoft Jenny Online", "Samantha"] },
  pet:        { rate: 1.05, pitch: 1.3,  voicePreferences: ["Microsoft Aria Online", "Karen"] },
};

// Quick suggestions a child can tap to learn what to say next, per scenario.
const SCENARIO_HINTS: Record<string, string[]> = {
  restaurant: ["Could I see the menu, please?", "I'd like a cheese pizza.", "Can I have some water?", "How much does it cost?"],
  store:      ["How much is this?", "Do you have it in blue?", "I'd like to buy this, please.", "Can you help me find a toy?"],
  school:     ["Hi! What's your name?", "Can I sit with you?", "What's your favorite subject?", "Want to play at recess?"],
  pet:        ["Can I see the puppies?", "What does this animal eat?", "Is she friendly?", "How big will it grow?"],
  doctor:     ["I have a sore throat.", "I feel a little dizzy.", "Will it hurt?", "When will I feel better?"],
  airport:    ["Here is my ticket.", "I'd like a window seat, please.", "How heavy can my bag be?", "Which gate is my flight?"],
};

const SCENARIOS: Scenario[] = [
  {
    id: "restaurant",
    title: "🍕 At a Restaurant",
    prompt: "ordering food at a restaurant",
    character: "a friendly waiter named Mario at a cozy pizza restaurant",
    tone: "warm, polite, and a little playful — use phrases like 'Right away!', 'Excellent choice!', 'How can I help you today?'",
  },
  {
    id: "store",
    title: "🛒 At a Store",
    prompt: "buying something at a store",
    character: "a cheerful shopkeeper named Lily at a small toy store",
    tone: "bright, helpful, and chatty — use phrases like 'Welcome!', 'Take your time looking around', 'Anything I can help you find?'",
  },
  {
    id: "school",
    title: "🏫 New Friend at School",
    prompt: "meeting a new friend at school",
    character: "a kind classmate named Alex on the first day of school",
    tone: "shy at first then friendly and curious — use kid-style phrases like 'Hi! Are you new?', 'Wanna sit with me at lunch?', 'What's your favorite subject?'",
  },
  {
    id: "pet",
    title: "🐕 Pet Shop Visit",
    prompt: "visiting a pet shop and asking about animals",
    character: "an enthusiastic pet shop owner named Sam who LOVES every animal",
    tone: "excited, knowledgeable, and full of fun animal facts — use phrases like 'Oh, you'll LOVE this one!', 'She's such a sweetie!', 'Did you know...?'",
  },
  {
    id: "doctor",
    title: "🩺 At the Doctor",
    prompt: "visiting a doctor for a check-up",
    character: "a kind family doctor named Dr. Maya doing a routine check-up",
    tone: "calm, reassuring, and curious — use phrases like 'How are you feeling today?', 'Let's take a look', 'You're being so brave!'",
  },
  {
    id: "airport",
    title: "✈️ At the Airport",
    prompt: "checking in for a flight at the airport",
    character: "a polite airline check-in agent named Priya at the boarding desk",
    tone: "professional and warm — use phrases like 'May I see your ticket?', 'Window or aisle seat?', 'Have a great flight!'",
  },
];

const Roleplay = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stopSpeakRef = useRef<(() => void) | null>(null);
  const { addXP } = useProgress();

  useEffect(() => {
    primeVoices();
    return () => {
      stopSpeakRef.current?.();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speakLine = (text: string) => {
    if (!voiceEnabled || !selectedScenario) return;
    const profile = SCENARIO_VOICES[selectedScenario.id];
    const clean = text.replace(/[*_`#>]/g, "").trim();
    if (!clean) return;
    stopSpeakRef.current?.();
    stopSpeakRef.current = speakHQ(clean, {
      lang: "en",
      rate: profile?.rate ?? 1,
      pitch: profile?.pitch ?? 1.1,
      volume: 1,
      voicePreferences: profile?.voicePreferences,
      onFallbackEngaged: () => {
        toast({
          title: "Voice tuned for clarity 🎚️",
          description: "Switched to a stable voice and slower pace for your device.",
        });
      },
    });
  };

  const buildSystemPrompt = (scenario: Scenario) => `You are ${scenario.character}, helping a child (age 6-16) practice English through a roleplay about ${scenario.prompt}.

CHARACTER & TONE: ${scenario.tone}. Stay 100% in character at all times — never break the fourth wall.

ROLEPLAY RULES:
- Set the scene briefly on your very first message (1-2 sentences) and ask the child what they'd like to do.
- After that, react to whatever the child says directly and realistically as your character.
- Keep every reply SHORT — 1 to 3 simple sentences.
- Encourage the child to use new vocabulary in context.
- If the child makes a grammar mistake, gently correct it INSIDE the roleplay (e.g. "Oh, you mean 'I would like a pizza'? Coming right up!").
- ANSWER any question the child asks in character — do not give generic greetings, do not change the subject.
- Use simple, age-appropriate words. No emojis, no asterisks, no stage directions.`;

  const startScenario = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([]);
    setIsLoading(true);

    const systemMessage: Message = {
      role: "user",
      content: `Let's begin! Set the scene for ${scenario.prompt} and greet me in character.`,
    };

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages([{ role: "assistant", content: assistantContent }]);
    };

    try {
      await streamChat({
        messages: [systemMessage],
        activityType: "roleplay",
        systemPrompt: buildSystemPrompt(scenario),
        onDelta: updateAssistant,
        onDone: () => {
          setIsLoading(false);
          speakLine(assistantContent);
        },
        onError: (error) => {
          toast({
            title: "Oops!",
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

  const handleSend = async (input: string) => {
    if (!selectedScenario) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        activityType: "roleplay",
        systemPrompt: buildSystemPrompt(selectedScenario),
        onDelta: updateAssistant,
        onDone: async () => {
          setIsLoading(false);
          speakLine(assistantContent);
          // Award XP for roleplay participation
          if (messages.length > 0 && messages.length % 4 === 0) {
            await addXP(20);
            toast({
              title: "Amazing roleplay! 🎭",
              description: "+20 XP for great conversation!",
            });
          }
        },
        onError: (error) => {
          toast({
            title: "Oops!",
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

  const resetScenario = () => {
    setSelectedScenario(null);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title="Roleplay"
        showBack
        icon={<Theater className="w-5 h-5 text-primary" />}
      />

      {!selectedScenario ? (
        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-light flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-orange" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Choose a Scenario</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Practice real-life conversations in fun situations!
            </p>
          </motion.div>

          <div className="flex justify-center mb-4">
            <VoiceTestButton langs={["en"]} className="rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SCENARIOS.map((scenario, index) => (
              <motion.button
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => startScenario(scenario)}
                className="bg-card rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow text-left"
              >
                <span className="text-2xl block mb-2">{scenario.title.split(" ")[0]}</span>
                <span className="font-semibold text-foreground text-sm">
                  {scenario.title.slice(scenario.title.indexOf(" ") + 1)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Scenario indicator */}
          <div className="px-4 py-2 flex items-center justify-between bg-orange-light">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedScenario.title.split(" ")[0]}</span>
              <span className="text-sm font-medium text-orange-900">
                {selectedScenario.title.slice(selectedScenario.title.indexOf(" ") + 1)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const list = SCENARIO_HINTS[selectedScenario.id] || [];
                  if (!list.length) return;
                  setHint(list[Math.floor(Math.random() * list.length)]);
                }}
                aria-label="Get a hint"
                title="Need a hint? Tap for a phrase to try."
                className="h-8 w-8 text-yellow-700"
              >
                <Lightbulb className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (voiceEnabled) {
                    stopSpeakRef.current?.();
                    window.speechSynthesis?.cancel();
                  }
                  setVoiceEnabled((v) => !v);
                }}
                aria-label={voiceEnabled ? "Mute voice" : "Unmute voice"}
                className="h-8 w-8"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setHint(null); resetScenario(); }}>
                Change
              </Button>
            </div>
          </div>

          {hint && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-2 p-2.5 rounded-xl bg-yellow-light border border-yellow/40 flex items-start gap-2"
            >
              <Lightbulb className="w-4 h-4 text-yellow-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-yellow-900">Try saying:</p>
                <p className="text-sm text-foreground italic">"{hint}"</p>
              </div>
              <button
                type="button"
                onClick={() => setHint(null)}
                className="text-xs text-yellow-900 font-bold px-1"
                aria-label="Dismiss hint"
              >
                ✕
              </button>
            </motion.div>
          )}

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
          </div>

          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            placeholder="Say something..."
          />
        </>
      )}
    </div>
  );
};

export default Roleplay;
