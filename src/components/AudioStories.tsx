import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headphones, Play, Pause, ChevronRight, Clock } from "lucide-react";
import { audioStoryEpisodes } from "@/data/audioStories";
import { useTextToSpeech } from "@/hooks/useVoice";
import { fireFeedback } from "@/hooks/useFeedback";
import { useUserId } from "@/hooks/useUserId";
import { supabase } from "@/integrations/supabase/client";

const AudioStories = () => {
  const [index, setIndex] = useState(0);
  const tts = useTextToSpeech({ rate: 0.85, pitch: 1.15 });
  const userId = useUserId();
  const startTimeRef = useRef<number | null>(null);
  const currentEpisodeRef = useRef<string | null>(null);
  const episode = audioStoryEpisodes[index];

  useEffect(() => {
    return () => {
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logListen = async (completed: boolean) => {
    if (!userId || !startTimeRef.current || !currentEpisodeRef.current) return;
    const ep = audioStoryEpisodes.find((e) => e.id === currentEpisodeRef.current);
    if (!ep) return;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (duration < 1) return;
    try {
      await supabase.from("audio_story_listens").insert({
        user_id: userId,
        story_id: ep.id,
        story_title: ep.title,
        duration_seconds: duration,
        completed,
      });
    } catch (err) {
      console.error("Failed to log story listen:", err);
    }
    startTimeRef.current = null;
    currentEpisodeRef.current = null;
  };

  const handleListen = () => {
    fireFeedback("tap");
    if (tts.isSpeaking) {
      tts.stop();
      logListen(false);
    } else {
      startTimeRef.current = Date.now();
      currentEpisodeRef.current = episode.id;
      tts.speak(episode.text, () => {
        logListen(true);
      });
    }
  };

  const handleNext = () => {
    fireFeedback("tap");
    if (tts.isSpeaking) {
      tts.stop();
      logListen(false);
    }
    setIndex((prev) => (prev + 1) % audioStoryEpisodes.length);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Headphones className="w-4 h-4 text-primary" />
          Audio Stories
        </h2>
        <span className="text-xs text-muted-foreground font-medium">
          {index + 1} / {audioStoryEpisodes.length}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl shadow-card bg-gradient-to-br from-primary to-[hsl(180,70%,40%)] p-5 text-primary-foreground">
        <AnimatePresence mode="wait">
          <motion.div
            key={episode.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <motion.div
                animate={
                  tts.isSpeaking
                    ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }
                    : { scale: 1 }
                }
                transition={{ duration: 1.5, repeat: tts.isSpeaking ? Infinity : 0 }}
                className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-3xl shrink-0"
                aria-hidden
              >
                {episode.emoji}
              </motion.div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full mb-1">
                  {episode.category}
                </span>
                <h3 className="font-bold text-base leading-tight">{episode.title}</h3>
                <div className="flex items-center gap-1 mt-1 text-xs text-primary-foreground/80">
                  <Clock className="w-3 h-3" />
                  <span>{episode.duration}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-primary-foreground/90 leading-relaxed line-clamp-3 mb-4">
              {episode.text}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleListen}
            className="flex items-center gap-2 bg-white text-primary text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-sm"
          >
            {tts.isSpeaking ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Listen
              </>
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="ml-auto flex items-center gap-1 text-primary-foreground text-sm font-bold px-3 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Speaking visualizer */}
        <AnimatePresence>
          {tts.isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 right-3 flex items-end gap-0.5"
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-white rounded-full"
                  animate={{ height: [4, 14, 4] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};

export default AudioStories;
