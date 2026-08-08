import { Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import AICharacterCard from "@/components/AICharacterCard";

import aiWhiskers from "@/assets/ai-whiskers.png";
import aiSpark from "@/assets/ai-spark.png";
import aiProfessor from "@/assets/ai-professor.png";
import aiDoraemon from "@/assets/ai-doraemon.png";
import aiShinchan from "@/assets/ai-shinchan.png";
import mascotImage from "@/assets/genie-mascot.png";
import { motion } from "framer-motion";

const characters = [
  {
    id: "whiskers",
    name: "Whiskers",
    description: "A friendly cat who helps beginners with simple English!",
    level: "Beginner" as const,
    duration: "5-10 min",
    image: aiWhiskers,
  },
  {
    id: "spark",
    name: "Spark",
    description: "An energetic robot who makes learning super fun!",
    level: "Beginner" as const,
    duration: "5-10 min",
    image: aiSpark,
  },
  {
    id: "professor",
    name: "Professor Hoot",
    description: "A wise owl for advanced English conversations!",
    level: "Advanced" as const,
    duration: "10-15 min",
    image: aiProfessor,
  },
  {
    id: "genie",
    name: "Genie",
    description: "Your magical companion for English adventures!",
    level: "Intermediate" as const,
    duration: "5-10 min",
    image: mascotImage,
  },
  {
    id: "doraemon",
    name: "Doraemon",
    description: "A cheerful robot cat from the future with a high, friendly voice!",
    level: "Beginner" as const,
    duration: "5-10 min",
    image: aiDoraemon,
  },
  {
    id: "shinchan",
    name: "Shin-chan",
    description: "A cheeky kindergartener with a playful, squeaky voice!",
    level: "Beginner" as const,
    duration: "5-10 min",
    image: aiShinchan,
  },
];

const Call = () => {
  const navigate = useNavigate();

  const handleStartCall = (characterId: string) => {
    navigate(`/call/${characterId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        title="Practice with AI"
        icon={<Phone className="w-5 h-5 text-primary" />}
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Intro Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary to-turquoise rounded-2xl p-4 mb-6 text-white"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">AI Voice Practice</h2>
              <p className="text-sm opacity-90 mt-1">
                Chat with fun AI characters to practice your English! Each character has their own personality and will help you learn.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h2 className="font-bold text-foreground">Choose Your Buddy</h2>
            <p className="text-sm text-muted-foreground">
              Pick an AI friend to practice with
            </p>
          </div>
        </motion.div>

        {/* Characters Grid */}
        <div className="grid grid-cols-2 gap-3">
          {characters.map((character, index) => (
            <AICharacterCard
              key={character.id}
              name={character.name}
              description={character.description}
              level={character.level}
              duration={character.duration}
              image={character.image}
              delay={index}
              onClick={() => handleStartCall(character.id)}
            />
          ))}
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-card rounded-2xl p-4 shadow-card"
        >
          <h3 className="font-bold text-foreground mb-2">💡 Tips for Great Practice</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Start with simple greetings like "Hello!" or "How are you?"</li>
            <li>• Don't worry about making mistakes - that's how we learn!</li>
            <li>• Try to respond in full sentences</li>
            <li>• Practice for at least 5 minutes to earn bonus XP</li>
          </ul>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Call;