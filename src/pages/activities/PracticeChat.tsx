import { useState, useRef, useEffect } from "react";
import { Languages, MessageCircle, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { streamChat } from "@/lib/streamChat";
import VoiceTestButton from "@/components/VoiceTestButton";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useProgress } from "@/hooks/useProgress";
import { toast } from "@/hooks/use-toast";
import mascotImage from "@/assets/genie-mascot.png";

type Message = { role: "user" | "assistant"; content: string };
type ChatLanguage = "en" | "hi";

const LANGUAGE_OPTIONS: Record<ChatLanguage, { label: string; speechLang: string; placeholder: string; instruction: string }> = {
  en: {
    label: "English",
    speechLang: "en-US",
    placeholder: "Ask anything in English or Hindi...",
    instruction: "Answer in simple English unless the child writes in Hindi or asks for Hindi.",
  },
  hi: {
    label: "Hindi",
    speechLang: "hi-IN",
    placeholder: "हिंदी में अपना सवाल पूछें...",
    instruction: "Answer in simple, child-friendly Hindi. If teaching an English word, explain it in Hindi.",
  },
};

const WELCOME_MESSAGE = "Hi there! 👋 I'm Genie, your English practice buddy! What would you like to talk about today? We could chat about your favorite games, movies, or anything you like! 🌟";

const PracticeChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [chatLanguage, setChatLanguage] = useAppLanguage() as unknown as [ChatLanguage, (l: ChatLanguage) => void, () => void];
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addXP } = useProgress();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (input: string) => {
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setMessageCount((c) => c + 1);

    let assistantContent = "";
    const updatedMessages = [...messages.filter(m => m.content !== WELCOME_MESSAGE), userMsg];

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== WELCOME_MESSAGE) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: updatedMessages,
        activityType: chatLanguage === "hi" ? "chat_hi" : "chat",
        onDelta: updateAssistant,
        onDone: async () => {
          setIsLoading(false);
          // Award XP every 3 messages
          if ((messageCount + 1) % 3 === 0) {
            await addXP(10);
            toast({
              title: "Great job! 🌟",
              description: "+10 XP for practicing!",
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

  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        title="Practice Chat"
        showBack
        icon={<MessageCircle className="w-5 h-5 text-primary" />}
      />

      {/* Language mode + XP indicator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-2 flex items-center gap-2 bg-yellow-light border-b border-yellow/30"
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            chatLanguage === "hi"
              ? "bg-orange-500 text-white"
              : "bg-blue-600 text-white"
          }`}
          aria-live="polite"
          title={`AI will reply in ${LANGUAGE_OPTIONS[chatLanguage].label}`}
        >
          <Languages className="w-3.5 h-3.5" />
          {LANGUAGE_OPTIONS[chatLanguage].label} mode
        </div>
        <Trophy className="w-4 h-4 text-yellow ml-1" />
        <span className="text-xs font-medium text-foreground">
          {3 - (messageCount % 3)} more for +10 XP
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <VoiceTestButton className="h-8 rounded-full text-xs" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setChatLanguage(chatLanguage === "en" ? "hi" : "en")}
            className="h-8 rounded-full gap-1 text-foreground hover:bg-yellow/20"
            disabled={isLoading}
          >
            <Languages className="w-4 h-4" />
            {chatLanguage === "en" ? "हिंदी" : "English"}
          </Button>
        </div>
      </motion.div>


      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {/* Welcome card */}
        {messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-6"
          >
            <img
              src={mascotImage}
              alt="Genie"
              className="w-24 h-24 mx-auto mb-3"
            />
            <h2 className="font-bold text-foreground">Let's Practice English!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Chat with me to improve your speaking skills
            </p>
          </motion.div>
        )}

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
        placeholder={LANGUAGE_OPTIONS[chatLanguage].placeholder}
        voiceLang={LANGUAGE_OPTIONS[chatLanguage].speechLang}
      />
    </div>
  );
};

export default PracticeChat;
