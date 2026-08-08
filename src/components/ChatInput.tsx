import { useState, useRef } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fireFeedback } from "@/hooks/useFeedback";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceLang?: string;
}

const ChatInput = ({ onSend, disabled, placeholder = "Type your message...", voiceLang = "en-US" }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      fireFeedback("success");
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startVoiceInput = () => {
    if (!speechSupported || disabled) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = voiceLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) finalText += `${text} `;
        else interim += text;
      }
      setInput((finalText + interim).trim());
    };
    recognition.onend = () => {
      setIsListening(false);
      const spokenText = finalText.trim();
      if (spokenText && !disabled) {
        fireFeedback("success");
        onSend(spokenText);
        setInput("");
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-card border-t border-border">
      <motion.div
        className="flex-1 relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />
      </motion.div>
      <Button
        onClick={handleSend}
        disabled={!input.trim() || disabled}
        size="icon"
        className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90"
      >
        <Send className="w-5 h-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full h-12 w-12"
        disabled={!speechSupported || disabled}
        onClick={isListening ? stopVoiceInput : startVoiceInput}
      >
        {isListening ? <MicOff className="w-5 h-5 text-destructive" /> : <Mic className="w-5 h-5 text-muted-foreground" />}
      </Button>
    </div>
  );
};

export default ChatInput;
