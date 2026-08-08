import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Shield, Zap, Clock, Star, Sparkles, ArrowLeft, Check, Coins, Palette, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProgress } from "@/hooks/useProgress";
import { useUserId } from "@/hooks/useUserId";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import confetti from "canvas-confetti";

type TabType = "power_ups" | "avatars" | "themes";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  currency: "coins" | "xp";
  emoji: string;
  color: string;
  type: TabType;
  oneTime?: boolean;
}

const shopItems: ShopItem[] = [
  // Power-ups
  { id: "streak-freeze", name: "Streak Freeze", description: "Protect your streak for 1 missed day", cost: 50, currency: "coins", emoji: "🛡️", color: "bg-[hsl(var(--turquoise))]/15 text-[hsl(var(--turquoise))]", type: "power_ups" },
  { id: "bonus-lessons", name: "Bonus Lessons", description: "Unlock 3 extra lessons", cost: 75, currency: "coins", emoji: "📚", color: "bg-[hsl(var(--yellow))]/15 text-[hsl(var(--yellow))]", type: "power_ups" },
  { id: "streak-boost", name: "Streak Boost", description: "+3 days to goal streak multiplier", cost: 100, currency: "coins", emoji: "⚡", color: "bg-[hsl(var(--orange))]/15 text-[hsl(var(--orange))]", type: "power_ups" },
  { id: "double-xp", name: "Double XP (24h)", description: "Earn 2× XP for the next 24 hours", cost: 150, currency: "coins", emoji: "✨", color: "bg-[hsl(var(--purple))]/15 text-[hsl(var(--purple))]", type: "power_ups" },
  { id: "hint-pack", name: "Hint Pack (5)", description: "5 free hints in quizzes & challenges", cost: 40, currency: "coins", emoji: "💡", color: "bg-[hsl(var(--green))]/15 text-[hsl(var(--green))]", type: "power_ups" },
  // Avatars
  { id: "avatar-astronaut", name: "Astronaut", description: "Space explorer avatar", cost: 200, currency: "coins", emoji: "🧑‍🚀", color: "bg-[hsl(var(--turquoise))]/15 text-[hsl(var(--turquoise))]", type: "avatars", oneTime: true },
  { id: "avatar-wizard", name: "Wizard", description: "Magical wizard avatar", cost: 200, currency: "coins", emoji: "🧙", color: "bg-[hsl(var(--purple))]/15 text-[hsl(var(--purple))]", type: "avatars", oneTime: true },
  { id: "avatar-ninja", name: "Ninja", description: "Stealthy ninja avatar", cost: 250, currency: "coins", emoji: "🥷", color: "bg-muted text-foreground", type: "avatars", oneTime: true },
  { id: "avatar-pirate", name: "Pirate", description: "Adventure pirate avatar", cost: 250, currency: "coins", emoji: "🏴‍☠️", color: "bg-[hsl(var(--orange))]/15 text-[hsl(var(--orange))]", type: "avatars", oneTime: true },
  { id: "avatar-robot", name: "Robot", description: "Futuristic robot avatar", cost: 300, currency: "coins", emoji: "🤖", color: "bg-[hsl(var(--green))]/15 text-[hsl(var(--green))]", type: "avatars", oneTime: true },
  { id: "avatar-dragon", name: "Dragon", description: "Legendary dragon avatar", cost: 500, currency: "coins", emoji: "🐉", color: "bg-[hsl(var(--orange))]/15 text-[hsl(var(--orange))]", type: "avatars", oneTime: true },
  // Themes
  { id: "theme-ocean", name: "Ocean Breeze", description: "Cool blue ocean theme", cost: 300, currency: "coins", emoji: "🌊", color: "bg-[hsl(var(--turquoise))]/15 text-[hsl(var(--turquoise))]", type: "themes", oneTime: true },
  { id: "theme-sunset", name: "Sunset Glow", description: "Warm orange sunset theme", cost: 300, currency: "coins", emoji: "🌅", color: "bg-[hsl(var(--orange))]/15 text-[hsl(var(--orange))]", type: "themes", oneTime: true },
  { id: "theme-forest", name: "Forest Walk", description: "Natural green forest theme", cost: 300, currency: "coins", emoji: "🌲", color: "bg-[hsl(var(--green))]/15 text-[hsl(var(--green))]", type: "themes", oneTime: true },
  { id: "theme-galaxy", name: "Galaxy Night", description: "Deep purple galaxy theme", cost: 500, currency: "coins", emoji: "🌌", color: "bg-[hsl(var(--purple))]/15 text-[hsl(var(--purple))]", type: "themes", oneTime: true },
  { id: "theme-candy", name: "Candy Land", description: "Sweet pink candy theme", cost: 400, currency: "coins", emoji: "🍭", color: "bg-[hsl(var(--pink))]/15 text-[hsl(var(--pink))]", type: "themes", oneTime: true },
];

const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "power_ups", label: "Power-ups", icon: <Zap className="w-4 h-4" /> },
  { key: "avatars", label: "Avatars", icon: <User className="w-4 h-4" /> },
  { key: "themes", label: "Themes", icon: <Palette className="w-4 h-4" /> },
];

const RewardsShop = () => {
  const navigate = useNavigate();
  const { progress, spendCoins, refetch } = useProgress();
  const userId = useUserId();
  const [activeTab, setActiveTab] = useState<TabType>("power_ups");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [streakFreezes, setStreakFreezes] = useState(0);

  const coins = progress?.coins ?? 0;
  const xp = progress?.xp ?? 0;

  useEffect(() => {
    if (!userId) return;
    // Fetch owned purchases
    supabase
      .from("user_purchases")
      .select("item_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setOwnedItems(new Set(data.map(d => d.item_id)));
      });
    // Fetch streak freezes
    supabase
      .from("user_progress")
      .select("streak_freezes")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setStreakFreezes((data as any)?.streak_freezes ?? 0);
      });
  }, [userId]);

  const handleBuy = async (item: ShopItem) => {
    if (!userId || purchasing) return;
    
    const isOwned = ownedItems.has(item.id) && item.oneTime;
    if (isOwned) return;

    if (coins < item.cost) return;

    setPurchasing(item.id);
    try {
      const ok = await spendCoins(item.cost);
      if (!ok) return;

      // Apply item effect
      if (item.id === "streak-freeze") {
        const newCount = streakFreezes + 1;
        await supabase.from("user_progress").update({ streak_freezes: newCount } as any).eq("user_id", userId);
        setStreakFreezes(newCount);
      } else if (item.id === "bonus-lessons" && progress) {
        await supabase.from("user_progress").update({ total_lessons: progress.total_lessons + 3 } as any).eq("user_id", userId);
      } else if (item.id === "streak-boost" && progress) {
        await supabase.from("user_progress").update({ goal_streak: progress.goal_streak + 3 } as any).eq("user_id", userId);
      } else if (item.id === "double-xp") {
        localStorage.setItem("speakgenie_double_xp_until", (Date.now() + 24 * 60 * 60 * 1000).toString());
      } else if (item.id === "hint-pack") {
        const current = Number(localStorage.getItem("speakgenie_hints") || "0");
        localStorage.setItem("speakgenie_hints", (current + 5).toString());
      }

      // Record purchase
      if (item.oneTime) {
        await supabase.from("user_purchases").insert({ user_id: userId, item_id: item.id, item_type: item.type });
        setOwnedItems(prev => new Set([...prev, item.id]));
      }

      await refetch();

      setJustBought(item.id);
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 }, colors: ["#FFD700", "#4ECDC4", "#C084FC"] });

      try {
        const ctx = new AudioContext();
        [523.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.25);
        });
      } catch {}

      setTimeout(() => setJustBought(null), 2000);
    } finally {
      setPurchasing(null);
    }
  };

  const doubleXPUntil = Number(localStorage.getItem("speakgenie_double_xp_until") || "0");
  const doubleXPActive = doubleXPUntil > Date.now();

  const filteredItems = shopItems.filter(i => i.type === activeTab);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[hsl(var(--purple))] to-[hsl(280,70%,40%)] text-primary-foreground p-6 pb-12 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingBag className="w-6 h-6" /> Rewards Shop
              </h1>
              <p className="text-primary-foreground/70 text-sm">Spend your coins on cool rewards!</p>
            </div>
          </div>

          {/* Balance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary-foreground/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-around"
          >
            <div className="text-center">
              <p className="text-xs text-primary-foreground/70">Coins</p>
              <p className="text-2xl font-black flex items-center gap-1 justify-center">
                <Coins className="w-5 h-5 text-[hsl(var(--yellow))]" />
                {coins.toLocaleString()}
              </p>
            </div>
            <div className="w-px h-10 bg-primary-foreground/20" />
            <div className="text-center">
              <p className="text-xs text-primary-foreground/70">XP</p>
              <p className="text-2xl font-black">{xp.toLocaleString()}</p>
            </div>
            {doubleXPActive && (
              <>
                <div className="w-px h-10 bg-primary-foreground/20" />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                  <p className="text-xs font-semibold">✨ 2× XP</p>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6">
        {/* Tabs */}
        <div className="flex bg-card rounded-2xl shadow-card p-1 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {filteredItems.map((item, index) => {
                const canAfford = coins >= item.cost;
                const isBuying = purchasing === item.id;
                const bought = justBought === item.id;
                const isOwned = ownedItems.has(item.id) && item.oneTime;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="bg-card rounded-2xl shadow-card p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${item.color}`}>
                        {item.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                          {item.id === "streak-freeze" && streakFreezes > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">×{streakFreezes}</span>
                          )}
                          {isOwned && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[hsl(var(--green))]/20 text-[hsl(var(--green))]">Owned</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>

                      <AnimatePresence mode="wait">
                        {isOwned ? (
                          <motion.div key="owned" className="w-20 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <Check className="w-5 h-5 text-[hsl(var(--green))]" />
                          </motion.div>
                        ) : bought ? (
                          <motion.div
                            key="bought"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-20 h-10 rounded-xl bg-[hsl(var(--green))] flex items-center justify-center"
                          >
                            <Check className="w-5 h-5 text-primary-foreground" />
                          </motion.div>
                        ) : (
                          <motion.button
                            key="buy"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleBuy(item)}
                            disabled={!canAfford || isBuying}
                            className={`w-20 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition-colors ${
                              canAfford
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                            }`}
                          >
                            {isBuying ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                                className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                              />
                            ) : !canAfford ? (
                              <><Lock className="w-3 h-3" />{item.cost}</>
                            ) : (
                              <><Coins className="w-3 h-3" />{item.cost}</>
                            )}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-accent/50 rounded-2xl p-4 text-center mt-6"
        >
          <p className="text-sm text-muted-foreground">
            🪙 Earn coins by completing activities — 1 coin per 10 XP!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Avatars & themes are one-time purchases.
          </p>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RewardsShop;
