import { useState, useEffect } from "react";
import { Trophy, Medal, Crown, Flame, Star } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/useUserId";

interface LeaderboardEntry {
  user_id: string;
  xp: number;
  level: number;
  streak_days: number;
  display_name: string;
}

const ANIMAL_NAMES = [
  "Brave Lion", "Clever Fox", "Swift Eagle", "Happy Dolphin", "Wise Owl",
  "Mighty Bear", "Quick Rabbit", "Cool Penguin", "Bright Parrot", "Strong Tiger",
  "Kind Panda", "Fast Cheetah", "Smart Octopus", "Jolly Koala", "Bold Hawk",
  "Calm Turtle", "Keen Falcon", "Noble Wolf", "Gentle Deer", "Playful Otter",
];

function getAnimalName(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) % ANIMAL_NAMES.length;
  }
  return ANIMAL_NAMES[Math.abs(hash) % ANIMAL_NAMES.length];
}

const RANK_ICONS = [
  <Crown className="w-6 h-6 text-yellow" />,
  <Medal className="w-6 h-6 text-muted-foreground" />,
  <Medal className="w-6 h-6 text-orange" />,
];

const Leaderboard = () => {
  const userId = useUserId();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from("user_progress")
          .select("user_id, xp, level, streak_days")
          .order("xp", { ascending: false })
          .limit(50);

        if (error) throw error;

        const mapped: LeaderboardEntry[] = (data || []).map((d) => ({
          ...d,
          display_name: getAnimalName(d.user_id),
        }));

        setEntries(mapped);

        if (userId) {
          const idx = mapped.findIndex((e) => e.user_id === userId);
          setUserRank(idx >= 0 ? idx + 1 : null);
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        // Show fallback
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Leaderboard" showBack icon={<Trophy className="w-5 h-5 text-yellow" />} />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* User's rank card */}
        {userRank !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-6 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">#{userRank}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Your Rank</p>
              <p className="text-sm text-muted-foreground">Keep learning to climb higher! 🚀</p>
            </div>
            <Star className="w-5 h-5 text-primary" />
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No learners yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isCurrentUser = entry.user_id === userId;
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isCurrentUser
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border"
                  } ${i < 3 ? "shadow-card" : ""}`}
                >
                  {/* Rank */}
                  <div className="w-10 flex items-center justify-center">
                    {i < 3 ? RANK_ICONS[i] : (
                      <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar circle */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? "bg-yellow/20 text-yellow" :
                    i === 1 ? "bg-muted text-muted-foreground" :
                    i === 2 ? "bg-orange/20 text-orange" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {entry.display_name.charAt(0)}
                  </div>

                  {/* Name & details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">
                      {entry.display_name} {isCurrentUser && <span className="text-primary">(You)</span>}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Lvl {entry.level}</span>
                      {entry.streak_days > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-orange" /> {entry.streak_days}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <p className="font-bold text-foreground text-sm">{entry.xp.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
