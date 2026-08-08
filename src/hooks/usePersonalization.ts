import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "./useUserId";

export type SkillLevel = "beginner" | "elementary" | "intermediate" | "advanced";

export interface MissedTopic {
  topic: string;
  activity_type: string;
  miss_count: number;
}

export interface Personalization {
  age: number | null;
  skillLevel: SkillLevel;
  missedTopics: MissedTopic[];
  loading: boolean;
  refetch: () => void;
}

const LEVEL_ORDER: SkillLevel[] = ["beginner", "elementary", "intermediate", "advanced"];

/** Derives a level from XP when the profile has no explicit skill level yet. */
export const levelFromXP = (xp: number): SkillLevel => {
  if (xp >= 600) return "advanced";
  if (xp >= 300) return "intermediate";
  if (xp >= 100) return "elementary";
  return "beginner";
};

export const levelIndex = (level: SkillLevel) => Math.max(0, LEVEL_ORDER.indexOf(level));

/** Records a wrong answer so future activities can revisit the weak topic. */
export const recordMissedTopic = async (
  userId: string | null,
  topic: string,
  activityType = "quiz"
) => {
  if (!userId || !topic) return;
  try {
    const { data } = await supabase
      .from("missed_topics")
      .select("id, miss_count")
      .eq("user_id", userId)
      .eq("topic", topic)
      .eq("activity_type", activityType)
      .maybeSingle();

    if (data) {
      await supabase
        .from("missed_topics")
        .update({ miss_count: data.miss_count + 1, last_missed_at: new Date().toISOString() })
        .eq("id", data.id);
    } else {
      await supabase
        .from("missed_topics")
        .insert({ user_id: userId, topic, activity_type: activityType });
    }
  } catch (err) {
    console.error("[Personalization] recordMissedTopic failed:", err);
  }
};

/** Clears a topic once the child answers it correctly again. */
export const clearMissedTopic = async (
  userId: string | null,
  topic: string,
  activityType = "quiz"
) => {
  if (!userId || !topic) return;
  try {
    await supabase
      .from("missed_topics")
      .delete()
      .eq("user_id", userId)
      .eq("topic", topic)
      .eq("activity_type", activityType);
  } catch (err) {
    console.error("[Personalization] clearMissedTopic failed:", err);
  }
};

export const usePersonalization = (): Personalization => {
  const userId = useUserId();
  const [age, setAge] = useState<number | null>(null);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("beginner");
  const [missedTopics, setMissedTopics] = useState<MissedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const [profileRes, missedRes, progressRes] = await Promise.all([
          supabase.from("profiles").select("age, skill_level").eq("id", userId).maybeSingle(),
          supabase
            .from("missed_topics")
            .select("topic, activity_type, miss_count")
            .eq("user_id", userId)
            .order("miss_count", { ascending: false })
            .limit(25),
          supabase.from("user_progress").select("xp").eq("user_id", userId).maybeSingle(),
        ]);

        if (cancelled) return;

        const xp = progressRes.data?.xp ?? 0;
        const profileLevel = profileRes.data?.skill_level as SkillLevel | undefined;
        setAge(profileRes.data?.age ?? null);
        setSkillLevel(
          profileLevel && LEVEL_ORDER.includes(profileLevel) && profileLevel !== "beginner"
            ? profileLevel
            : levelFromXP(xp)
        );
        setMissedTopics((missedRes.data as MissedTopic[]) ?? []);
      } catch (err) {
        console.error("[Personalization] load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, nonce]);

  return { age, skillLevel, missedTopics, loading, refetch };
};
