import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fireFeedback } from "@/hooks/useFeedback";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  icon?: React.ReactNode;
}

const PageHeader = ({ title, showBack = false, icon }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 border-b border-border">
      <div className="flex items-center justify-center h-14 px-4 relative max-w-lg mx-auto">
        {showBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { fireFeedback("navigation"); navigate(-1); }}
            aria-label="Go back"
            className="absolute left-4 p-2 -ml-2 rounded-full hover:bg-muted min-h-11 min-w-11 flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </motion.button>
        )}
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
