import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Volume2, VolumeX, ChevronRight, Sparkles } from "lucide-react";
import { funFacts } from "@/data/funFacts";
import { useTextToSpeech } from "@/hooks/useVoice";
import { fireFeedback } from "@/hooks/useFeedback";

const DidYouKnow = () => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * funFacts.length));
  const tts = useTextToSpeech({ rate: 0.9, pitch: 1.1 });
  const fact = funFacts[index];

  useEffect(() => {
    return () => {
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    fireFeedback("tap");
    tts.stop();
    setIndex((prev) => (prev + 1) % funFacts.length);
  };

  const handleSpeak = () => {
    fireFeedback("tap");
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      tts.speak(`Did you know? ${fact.fact}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="relative overflow-hidden rounded-2xl shadow-card bg-gradient-to-br from-[hsl(var(--yellow-light))] to-[hsl(var(--card-orange))] p-5"
    >
      {/* Decorative sparkles */}
      <motion.div
        className="absolute top-2 right-2 text-white/40"
        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Sparkles className="w-5 h-5" />
      </motion.div>

      <div className="flex items-center gap-2 mb-2">
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"
        >
          <Lightbulb className="w-4 h-4 text-white" />
        </motion.div>
        <h3 className="font-bold text-white text-sm uppercase tracking-wide">Did You Know?</h3>
        <span className="ml-auto text-[10px] font-bold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
          {fact.category}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={fact.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-3"
        >
          <span className="text-3xl shrink-0" aria-hidden>
            {fact.emoji}
          </span>
          <p className="text-white font-medium text-sm leading-relaxed flex-1">
            {fact.fact}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2 mt-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSpeak}
          className="flex items-center gap-2 bg-white/25 hover:bg-white/35 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          {tts.isSpeaking ? (
            <>
              <VolumeX className="w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              Listen
            </>
          )}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          className="ml-auto flex items-center gap-1 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-white/20 transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Speaking indicator */}
      <AnimatePresence>
        {tts.isSpeaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-2 right-2 flex items-end gap-0.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-white rounded-full"
                animate={{ height: [4, 12, 4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DidYouKnow;
