import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const OfflineBanner = () => {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          role="status"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-md"
        >
          <WifiOff className="w-4 h-4" />
          You're offline — some features may not work until you reconnect.
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
