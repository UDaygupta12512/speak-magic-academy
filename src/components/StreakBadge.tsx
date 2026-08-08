import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  streak: number;
}

const StreakBadge = ({ streak }: StreakBadgeProps) => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-1.5 bg-orange-light px-3 py-1.5 rounded-full"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
      >
        <Flame className="w-5 h-5 text-orange" />
      </motion.div>
      <span className="font-bold text-orange text-sm">{streak}</span>
    </motion.div>
  );
};

export default StreakBadge;
