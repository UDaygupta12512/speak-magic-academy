import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

const ANON_KEY = "speakgenie_user_id";
const MIGRATED_KEY = "speakgenie_anon_migrated";

async function migrateAnonymousDataOnce(userId: string) {
  try {
    const anonId = localStorage.getItem(ANON_KEY);
    const migratedFor = localStorage.getItem(MIGRATED_KEY);
    if (!anonId || anonId === userId || migratedFor === userId) return;
    const { error } = await supabase.rpc("migrate_anonymous_data" as any, {
      anon_user_id: anonId,
    });
    if (!error) {
      localStorage.setItem(MIGRATED_KEY, userId);
      localStorage.setItem(ANON_KEY, userId);
    } else {
      console.error("[Auth] migrate_anonymous_data failed:", error);
    }
  } catch (err) {
    console.error("[Auth] migration error:", err);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register listener first
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer non-auth Supabase calls to avoid deadlocks
        setTimeout(() => {
          migrateAnonymousDataOnce(newSession.user.id);
          localStorage.setItem(ANON_KEY, newSession.user.id);
        }, 0);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        localStorage.setItem(ANON_KEY, existing.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(MIGRATED_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
