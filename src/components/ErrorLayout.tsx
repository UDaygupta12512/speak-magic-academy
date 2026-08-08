import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import mascotImage from "@/assets/genie-mascot.png";

interface ErrorLayoutProps {
  code: string;
  title: string;
  message: string;
  emoji?: string;
  primaryAction?: { label: string; to?: string; onClick?: () => void };
  secondaryAction?: { label: string; to?: string; onClick?: () => void };
  accent?: "primary" | "yellow" | "destructive" | "muted";
}

const accentClasses: Record<NonNullable<ErrorLayoutProps["accent"]>, string> = {
  primary: "from-primary/20 to-primary/5",
  yellow: "from-yellow/30 to-yellow/5",
  destructive: "from-destructive/20 to-destructive/5",
  muted: "from-muted to-background",
};

const ErrorLayout = ({
  code,
  title,
  message,
  emoji = "🧞",
  primaryAction,
  secondaryAction,
  accent = "primary",
}: ErrorLayoutProps) => {
  return (
    <div
      className={`min-h-[100dvh] w-full flex items-center justify-center px-4 py-10 bg-gradient-to-br ${accentClasses[accent]}`}
    >
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 12 }}
          className="relative mx-auto mb-6 w-40 h-40 sm:w-48 sm:h-48"
        >
          <motion.img
            src={mascotImage}
            alt="Genie mascot"
            className="w-full h-full object-contain drop-shadow-xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="absolute -top-2 -right-2 bg-card border-2 border-border rounded-2xl px-3 py-1.5 shadow-lg text-2xl"
            aria-hidden
          >
            {emoji}
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-5xl sm:text-6xl font-extrabold text-foreground tracking-tight"
        >
          {code}
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-2 text-xl sm:text-2xl font-bold text-foreground"
        >
          {title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-3 text-sm sm:text-base text-muted-foreground max-w-sm mx-auto"
        >
          {message}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {primaryAction && (
            primaryAction.to ? (
              <Button asChild size="lg" className="w-full sm:w-auto rounded-full">
                <Link to={primaryAction.to}>
                  <Home className="w-4 h-4 mr-2" />
                  {primaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button size="lg" onClick={primaryAction.onClick} className="w-full sm:w-auto rounded-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                {primaryAction.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.to ? (
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full">
                <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" onClick={secondaryAction.onClick} className="w-full sm:w-auto rounded-full">
                {secondaryAction.label}
              </Button>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ErrorLayout;
