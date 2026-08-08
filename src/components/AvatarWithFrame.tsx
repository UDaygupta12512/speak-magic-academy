import { motion } from "framer-motion";
import { getFrameStyle } from "./LevelUpCelebration";

interface AvatarWithFrameProps {
  level: number;
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

const AvatarWithFrame = ({ level, src, alt = "Avatar", size = 96, className = "" }: AvatarWithFrameProps) => {
  const frame = getFrameStyle(level);
  const borderWidth = Math.max(3, Math.round(size / 24));

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      {/* Animated gradient border */}
      <div
        className="rounded-full"
        style={{
          width: size + borderWidth * 2,
          height: size + borderWidth * 2,
          background: frame.gradient,
          padding: borderWidth,
        }}
      >
        <div className="rounded-full overflow-hidden bg-card" style={{ width: size, height: size }}>
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Level badge */}
      <div
        className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center text-xs font-bold shadow-md"
        style={{
          width: Math.max(24, size / 3.5),
          height: Math.max(24, size / 3.5),
          background: frame.gradient,
          color: "white",
        }}
      >
        {level}
      </div>

      {/* Frame emoji indicator */}
      <div
        className="absolute -top-1 -left-1 text-sm"
        style={{ fontSize: Math.max(14, size / 6) }}
      >
        {frame.emoji}
      </div>
    </motion.div>
  );
};

export default AvatarWithFrame;
