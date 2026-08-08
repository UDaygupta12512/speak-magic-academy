import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AICharacterCardProps {
  name: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  image: string;
  onClick?: () => void;
  delay?: number;
}

const levelVariants = {
  Beginner: "beginner" as const,
  Intermediate: "intermediate" as const,
  Advanced: "advanced" as const,
};

const AICharacterCard = ({
  name,
  description,
  level,
  duration,
  image,
  onClick,
  delay = 0,
}: AICharacterCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      className="bg-card rounded-2xl overflow-hidden shadow-card p-4"
    >
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted mb-3">
          <img loading="lazy" decoding="async" src={image} alt={name} className="w-full h-full object-cover" />
        </div>
        <h3 className="font-bold text-foreground text-center">{name}</h3>
        <p className="text-muted-foreground text-xs text-center mt-1 line-clamp-2">
          {description}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant={levelVariants[level]}>
            {level}
          </Badge>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">{duration}</span>
          </div>
        </div>
        <Button
          onClick={onClick}
          className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl"
        >
          Start Call
        </Button>
      </div>
    </motion.div>
  );
};

export default AICharacterCard;
