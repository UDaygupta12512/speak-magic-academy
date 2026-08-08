import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Crown, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface LevelUpCelebrationProps {
  level: number;
  show: boolean;
  onClose: () => void;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Beginner",
  2: "Explorer",
  3: "Adventurer",
  4: "Scholar",
  5: "Learner",
  6: "Champion",
  7: "Master",
  8: "Legend",
  9: "Grandmaster",
  10: "Genius",
};

const getLevelTitle = (level: number) =>
  LEVEL_TITLES[level] ?? `Level ${level}`;

const LevelUpCelebration = ({ level, show, onClose }: LevelUpCelebrationProps) => {
  useEffect(() => {
    if (!show) return;

    // Big confetti burst
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#C084FC", "#FB923C"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Play level-up sound
    try {
      const ctx = new AudioContext();
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.4);
      });
    } catch {}

    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="bg-card rounded-3xl p-8 shadow-xl max-w-xs w-full text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-16 h-16 rounded-full bg-[hsl(var(--yellow))]" />
              <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full bg-[hsl(var(--purple))]" />
              <div className="absolute top-1/2 right-8 w-10 h-10 rounded-full bg-[hsl(var(--turquoise))]" />
            </div>

            <motion.div
              animate={{ rotate: [0, 10, -10, 5, -5, 0] }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative z-10"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[hsl(var(--yellow))] to-[hsl(var(--orange))] flex items-center justify-center shadow-lg">
                <Crown className="w-10 h-10 text-primary-foreground" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative z-10"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Sparkles className="w-4 h-4 text-[hsl(var(--yellow))]" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Level Up!</p>
                <Sparkles className="w-4 h-4 text-[hsl(var(--yellow))]" />
              </div>

              <motion.p
                className="text-5xl font-black text-foreground mb-1"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {level}
              </motion.p>

              <p className="text-lg font-bold text-primary mb-2">{getLevelTitle(level)}</p>
              <p className="text-sm text-muted-foreground mb-4">
                You unlocked a new avatar frame! 🎨
              </p>

              {/* Frame preview */}
              <div className="flex justify-center mb-4">
                <AvatarFramePreview level={level} size={72} />
              </div>

              <div className="flex gap-1 justify-center">
                {[...Array(Math.min(level, 10))].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                  >
                    <Star className="w-5 h-5 text-[hsl(var(--yellow))] fill-[hsl(var(--yellow))]" />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              onClick={onClose}
              className="mt-5 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm relative z-10"
            >
              Awesome!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Avatar frame preview inside celebration ──────────────────
const AvatarFramePreview = ({ level, size }: { level: number; size: number }) => {
  const frameStyle = getFrameStyle(level);

  return (
    <div
      className="rounded-full flex items-center justify-center"
      style={{
        width: size + 12,
        height: size + 12,
        background: frameStyle.gradient,
        padding: 3,
      }}
    >
      <div
        className="rounded-full bg-card flex items-center justify-center text-2xl"
        style={{ width: size, height: size }}
      >
        {frameStyle.emoji}
      </div>
    </div>
  );
};

// ── Frame styles by level ────────────────────────────────────
export interface FrameStyle {
  gradient: string;
  emoji: string;
  name: string;
  borderClass: string;
}

export const ALL_FRAMES: FrameStyle[] = [
  { gradient: "linear-gradient(135deg, hsl(200,80%,60%), hsl(180,70%,50%))", emoji: "🌊", name: "Ocean", borderClass: "from-[hsl(200,80%,60%)] to-[hsl(180,70%,50%)]" },
  { gradient: "linear-gradient(135deg, hsl(120,60%,50%), hsl(150,70%,45%))", emoji: "🌿", name: "Forest", borderClass: "from-[hsl(120,60%,50%)] to-[hsl(150,70%,45%)]" },
  { gradient: "linear-gradient(135deg, hsl(35,90%,55%), hsl(45,100%,55%))", emoji: "☀️", name: "Sunshine", borderClass: "from-[hsl(35,90%,55%)] to-[hsl(45,100%,55%)]" },
  { gradient: "linear-gradient(135deg, hsl(280,70%,55%), hsl(310,80%,55%))", emoji: "🔮", name: "Mystic", borderClass: "from-[hsl(280,70%,55%)] to-[hsl(310,80%,55%)]" },
  { gradient: "linear-gradient(135deg, hsl(350,85%,55%), hsl(20,90%,55%))", emoji: "🔥", name: "Blaze", borderClass: "from-[hsl(350,85%,55%)] to-[hsl(20,90%,55%)]" },
  { gradient: "linear-gradient(135deg, hsl(50,100%,50%), hsl(35,100%,45%))", emoji: "👑", name: "Royal Gold", borderClass: "from-[hsl(50,100%,50%)] to-[hsl(35,100%,45%)]" },
  { gradient: "linear-gradient(135deg, hsl(210,100%,60%), hsl(250,80%,60%))", emoji: "💎", name: "Diamond", borderClass: "from-[hsl(210,100%,60%)] to-[hsl(250,80%,60%)]" },
  { gradient: "linear-gradient(135deg, hsl(0,0%,20%), hsl(0,0%,40%))", emoji: "🖤", name: "Obsidian", borderClass: "from-[hsl(0,0%,20%)] to-[hsl(0,0%,40%)]" },
  { gradient: "linear-gradient(135deg, hsl(280,100%,70%), hsl(320,100%,60%), hsl(40,100%,60%))", emoji: "🌈", name: "Prismatic", borderClass: "from-[hsl(280,100%,70%)] via-[hsl(320,100%,60%)] to-[hsl(40,100%,60%)]" },
  { gradient: "linear-gradient(135deg, hsl(45,100%,70%), hsl(0,0%,100%), hsl(45,100%,70%))", emoji: "✨", name: "Celestial", borderClass: "from-[hsl(45,100%,70%)] via-[hsl(0,0%,95%)] to-[hsl(45,100%,70%)]" },
];

export const getFrameStyle = (level: number): FrameStyle => {
  const idx = Math.min(level - 1, ALL_FRAMES.length - 1);
  return ALL_FRAMES[Math.max(0, idx)];
};

export default LevelUpCelebration;
