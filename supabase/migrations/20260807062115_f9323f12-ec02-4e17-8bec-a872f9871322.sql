CREATE TABLE public.story_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  story_id text not null,
  paragraph_index integer not null default 0,
  audio_position numeric not null default 0,
  play_mode text not null default 'voice',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, story_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_progress TO authenticated;
GRANT ALL ON public.story_progress TO service_role;
ALTER TABLE public.story_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can select own rows" ON public.story_progress FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY "Owners can insert own rows" ON public.story_progress FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Owners can update own rows" ON public.story_progress FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Owners can delete own rows" ON public.story_progress FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);
CREATE TRIGGER update_story_progress_updated_at BEFORE UPDATE ON public.story_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.missed_topics (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic text not null,
  activity_type text not null default 'quiz',
  miss_count integer not null default 1,
  last_missed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic, activity_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.missed_topics TO authenticated;
GRANT ALL ON public.missed_topics TO service_role;
ALTER TABLE public.missed_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can select own rows" ON public.missed_topics FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY "Owners can insert own rows" ON public.missed_topics FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Owners can update own rows" ON public.missed_topics FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Owners can delete own rows" ON public.missed_topics FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);
CREATE TRIGGER update_missed_topics_updated_at BEFORE UPDATE ON public.missed_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skill_level text NOT NULL DEFAULT 'beginner';