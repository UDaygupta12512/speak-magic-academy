import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import mascotImage from "@/assets/genie-mascot.png";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

const ChatMessage = ({ role, content, isTyping }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2 mb-3", isUser && "flex-row-reverse")}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 overflow-hidden">
          <img src={mascotImage} alt="Genie" className="w-full h-full object-cover" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">
          {content}
          {isTyping && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-1.5 h-4 bg-current ml-0.5 align-middle"
            />
          )}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
          <span className="text-sm">😊</span>
        </div>
      )}
    </motion.div>
  );
};

export default ChatMessage;
