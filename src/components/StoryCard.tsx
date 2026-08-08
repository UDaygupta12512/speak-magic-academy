import { Clock, Play } from "lucide-react";
import { motion } from "framer-motion";
import { fireFeedback } from "@/hooks/useFeedback";

interface StoryCardProps {
  title: string;
  description: string;
  duration: string;
  image: string;
  onClick?: () => void;
  delay?: number;
}

const StoryCard = ({ title, description, duration, image, onClick, delay = 0 }: StoryCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { fireFeedback("tap"); onClick?.(); }}
      className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow text-left w-full"
    >
      <div className="aspect-square overflow-hidden">
        <img loading="lazy" decoding="async"
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className="font-bold text-foreground text-sm line-clamp-1">{title}</h3>
        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">{duration}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-foreground fill-current" />
          </div>
        </div>
      </div>
    </motion.button>
  );
};

export default StoryCard;
