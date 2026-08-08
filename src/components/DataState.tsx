import { motion } from "framer-motion";
import { Loader2, AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface LoadingProps {
  message?: string;
  className?: string;
}

const LoadingState = ({ message = "Loading…", className = "" }: LoadingProps) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground ${className}`}
  >
    <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

export default LoadingState;

interface ErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  className?: string;
}

export const ErrorState = ({
  title = "Something went wrong",
  message = "We couldn't load this right now. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className = "",
}: ErrorProps) => {
  const [retrying, setRetrying] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Single-flight: repeated clicks never fire duplicate requests, and the
  // same request is re-run safely without leaking state after unmount.
  const handleRetry = useCallback(async () => {
    if (!onRetry || inFlight.current) return;
    inFlight.current = true;
    setRetrying(true);
    try {
      await onRetry();
    } catch (err) {
      console.error("[ErrorState] retry failed:", err);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRetrying(false);
    }
  }, [onRetry]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 py-10 px-4 text-center rounded-2xl border border-destructive/30 bg-destructive/5 ${className}`}
    >
      <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden />
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button
          onClick={handleRetry}
          disabled={retrying}
          aria-busy={retrying}
          variant="outline"
          size="sm"
          className="gap-2 mt-1 min-h-11"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
          {retrying ? "Retrying…" : retryLabel}
        </Button>
      )}
    </motion.div>
  );
};

interface EmptyProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  title = "Nothing here yet",
  message = "Once you start using this feature, you'll see it here.",
  icon,
  action,
  className = "",
}: EmptyProps) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex flex-col items-center justify-center gap-3 py-12 px-4 text-center ${className}`}
  >
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
      {icon ?? <Inbox className="w-7 h-7" aria-hidden />}
    </div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    {action}
  </motion.div>
);
