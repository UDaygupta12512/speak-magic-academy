import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Trophy, MessageCircle, ShoppingBag, Sparkles, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import mascotImage from "@/assets/genie-mascot.png";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to SpeakGenie! ✨",
    description: "Your magical English learning companion! Let me show you around.",
    color: "hsl(var(--primary))",
    bg: "hsl(var(--turquoise-light))",
  },
  {
    icon: BookOpen,
    title: "Fun Lessons 📚",
    description: "Explore word games, phonics, tongue twisters, and more to build your skills!",
    color: "hsl(var(--purple))",
    bg: "hsl(var(--purple-light))",
  },
  {
    icon: MessageCircle,
    title: "Practice Speaking 🗣️",
    description: "Chat with friendly AI characters to practice real conversations!",
    color: "hsl(var(--orange))",
    bg: "hsl(var(--orange-light))",
  },
  {
    icon: Trophy,
    title: "Earn XP & Streaks 🔥",
    description: "Complete activities to earn XP, keep your streak alive, and level up!",
    color: "hsl(var(--green))",
    bg: "hsl(var(--green-light))",
  },
  {
    icon: ShoppingBag,
    title: "Rewards Shop 🎁",
    description: "Spend coins on cool avatars, themes, and power-ups in the shop!",
    color: "hsl(var(--pink))",
    bg: "hsl(var(--pink-light))",
  },
];

const ONBOARDING_KEY = "speakgenie_onboarding_done";

const OnboardingTour = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  if (!show) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -40 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-card rounded-3xl shadow-xl max-w-sm w-full overflow-hidden"
        >
          {/* Header */}
          <div className="relative p-6 pb-10 flex flex-col items-center text-center" style={{ background: current.bg }}>
            <button onClick={finish} className="absolute top-3 right-3 p-1 rounded-full bg-card/50 text-foreground/60 hover:bg-card/80">
              <X className="w-4 h-4" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.15 }}
              className="w-20 h-20 rounded-full bg-card shadow-md flex items-center justify-center mb-4"
            >
              {step === 0 ? (
                <img src={mascotImage} alt="SpeakGenie" className="w-14 h-14 object-contain" />
              ) : (
                <Icon className="w-10 h-10" style={{ color: current.color }} />
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-foreground"
            >
              {current.title}
            </motion.h2>
          </div>

          {/* Body */}
          <div className="p-6 pt-4 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-muted-foreground leading-relaxed mb-6"
            >
              {current.description}
            </motion.p>

            {/* Dots */}
            <div className="flex justify-center gap-2 mb-5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 24 : 8,
                    background: i === step ? current.color : "hsl(var(--muted))",
                  }}
                />
              ))}
            </div>

            <Button onClick={next} className="w-full rounded-xl h-12 text-base font-bold gap-2">
              {step < steps.length - 1 ? (
                <>Next <ChevronRight className="w-5 h-5" /></>
              ) : (
                "Let's Go! 🚀"
              )}
            </Button>

            {step < steps.length - 1 && (
              <button onClick={finish} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Skip tour
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
