
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migrate anonymous data on first sign-in (server-side, safe)
CREATE OR REPLACE FUNCTION public.migrate_anonymous_data(anon_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID := auth.uid();
  target_text TEXT;
BEGIN
  IF target IS NULL OR anon_user_id IS NULL OR anon_user_id = '' THEN
    RETURN;
  END IF;
  target_text := target::text;
  IF anon_user_id = target_text THEN
    RETURN;
  END IF;

  -- Move rows only if the authenticated user has no rows yet (avoid overwriting real data)
  UPDATE public.user_progress SET user_id = target_text
    WHERE user_id = anon_user_id
      AND NOT EXISTS (SELECT 1 FROM public.user_progress WHERE user_id = target_text);

  UPDATE public.activity_sessions SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.audio_story_listens SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.chat_messages SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.comic_books SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.daily_goals SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.daily_login_rewards SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.flashcards SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.game_scores SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.user_achievements SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.user_daily_challenge_progress SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.user_purchases SET user_id = target_text WHERE user_id = anon_user_id;
  UPDATE public.writing_exercises SET user_id = target_text WHERE user_id = anon_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_anonymous_data(TEXT) TO authenticated;
