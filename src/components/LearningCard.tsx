import { motion } from "framer-motion";
import { fireFeedback } from "@/hooks/useFeedback";

interface LearningCardProps {
  title: string;
  image: string;
  colorClass: string;
  onClick?: () => void;
  delay?: number;
}

const LearningCard = ({ title, image, colorClass, onClick, delay = 0 }: LearningCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { fireFeedback("tap"); onClick?.(); }}
      className={`${colorClass} rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow w-full aspect-[4/3] relative group`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <img loading="lazy" decoding="async"
          src={image}
          alt={title}
          className="w-full h-full object-cover rounded-xl"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="bg-card rounded-xl py-2.5 px-4 shadow-soft">
          <span className="font-bold text-foreground text-sm">{title}</span>
        </div>
      </div>
    </motion.button>
  );
};

export default LearningCard;
