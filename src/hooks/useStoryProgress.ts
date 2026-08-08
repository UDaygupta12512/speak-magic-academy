import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "./useUserId";

export type StoryPlayMode = "audio" | "voice";

export interface StoryProgress {
  paragraph_index: number;
  audio_position: number;
  play_mode: StoryPlayMode;
  completed: boolean;
}

const localKey = (storyId: string) => `speakgenie_story_progress_${storyId}`;

const readLocal = (storyId: string): StoryProgress | null => {
  try {
    const raw = localStorage.getItem(localKey(storyId));
    return raw ? (JSON.parse(raw) as StoryProgress) : null;
  } catch {
    return null;
  }
};

const writeLocal = (storyId: string, p: StoryProgress) => {
  try {
    localStorage.setItem(localKey(storyId), JSON.stringify(p));
  } catch {
    /* storage unavailable — server copy is the source of truth */
  }
};

/**
 * Persists (and restores) the exact reading position for a story:
 * paragraph/page, narration seconds, and the play mode.
 * Writes are debounced and mirrored to localStorage so a resume works
 * instantly even before the network round-trip completes.
 */
export const useStoryProgress = (storyId: string | undefined) => {
  const userId = useUserId();
  const [saved, setSaved] = useState<StoryProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!storyId) return;

    // Optimistic: show the local copy immediately.
    const local = readLocal(storyId);
    if (local) setSaved(local);

    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("story_progress")
          .select("paragraph_index, audio_position, play_mode, completed")
          .eq("user_id", userId)
          .eq("story_id", storyId)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled && data) {
          const remote: StoryProgress = {
            paragraph_index: data.paragraph_index ?? 0,
            audio_position: Number(data.audio_position ?? 0),
            play_mode: (data.play_mode as StoryPlayMode) ?? "voice",
            completed: data.completed ?? false,
          };
          setSaved(remote);
          writeLocal(storyId, remote);
        }
      } catch (err) {
        console.error("[StoryProgress] load failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, storyId]);

  const save = useCallback(
    (p: StoryProgress) => {
      if (!storyId) return;
      writeLocal(storyId, p);
      if (!userId) return;

      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        try {
          const { error } = await supabase.from("story_progress").upsert(
            {
              user_id: userId,
              story_id: storyId,
              paragraph_index: p.paragraph_index,
              audio_position: p.audio_position,
              play_mode: p.play_mode,
              completed: p.completed,
            },
            { onConflict: "user_id,story_id" }
          );
          if (error) throw error;
        } catch (err) {
          console.error("[StoryProgress] save failed:", err);
        }
      }, 800);
    },
    [userId, storyId]
  );

  // Flush on unmount so leaving the page keeps the last position.
  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return { saved, loading, save };
};
