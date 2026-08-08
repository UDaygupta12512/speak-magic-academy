import { motion } from "framer-motion";
import { Lock, Check, Palette } from "lucide-react";
import { ALL_FRAMES, type FrameStyle } from "./LevelUpCelebration";

interface FrameCollectionProps {
  currentLevel: number;
}

const FrameCollection = ({ currentLevel }: FrameCollectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-4 bg-card rounded-2xl shadow-card p-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <Palette className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Frame Collection</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {currentLevel >= ALL_FRAMES.length
          ? "All frames unlocked! 🎉"
          : `${currentLevel} of ${ALL_FRAMES.length} unlocked — level up to collect more!`}
      </p>

      <div className="grid grid-cols-5 gap-3">
        {ALL_FRAMES.map((frame, index) => {
          const requiredLevel = index + 1;
          const unlocked = currentLevel >= requiredLevel;

          return (
            <FrameCell
              key={frame.name}
              frame={frame}
              index={index}
              unlocked={unlocked}
              active={currentLevel === requiredLevel}
              requiredLevel={requiredLevel}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

const FrameCell = ({
  frame,
  index,
  unlocked,
  active,
  requiredLevel,
}: {
  frame: FrameStyle;
  index: number;
  unlocked: boolean;
  active: boolean;
  requiredLevel: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.05 * index }}
    className="flex flex-col items-center gap-1"
  >
    <div className="relative">
      {/* Frame ring */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${
          unlocked ? "" : "grayscale opacity-40"
        }`}
        style={{
          background: unlocked ? frame.gradient : "hsl(var(--muted))",
          padding: 2,
        }}
      >
        <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
          {frame.emoji}
        </div>
      </div>

      {/* Status badge */}
      {active ? (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      ) : !unlocked ? (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-muted-foreground flex items-center justify-center">
          <Lock className="w-2.5 h-2.5 text-background" />
        </div>
      ) : null}
    </div>

    <span className={`text-[9px] font-semibold text-center leading-tight ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
      {frame.name}
    </span>
    {!unlocked && (
      <span className="text-[8px] text-muted-foreground">Lv.{requiredLevel}</span>
    )}
  </motion.div>
);

export default FrameCollection;
