
-- Helper: drop every existing policy on a table, then recreate strict owner-scoped ones.
-- All user_id columns are TEXT, so we cast auth.uid() to text.

DO $$
DECLARE
  t text;
  p record;
  user_tables text[] := ARRAY[
    'activity_sessions','audio_story_listens','chat_messages','comic_books',
    'daily_goals','daily_login_rewards','flashcards','game_scores',
    'user_achievements','user_daily_challenge_progress','user_progress',
    'user_purchases','writing_exercises'
  ];
BEGIN
  FOREACH t IN ARRAY user_tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;

  -- Also drop policies on daily_challenges
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='daily_challenges' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_challenges', p.policyname);
  END LOOP;
END $$;

-- Recreate owner-scoped policies for every user-scoped table
DO $$
DECLARE
  t text;
  user_tables text[] := ARRAY[
    'activity_sessions','audio_story_listens','chat_messages','comic_books',
    'daily_goals','daily_login_rewards','flashcards','game_scores',
    'user_achievements','user_daily_challenge_progress','user_progress',
    'user_purchases','writing_exercises'
  ];
BEGIN
  FOREACH t IN ARRAY user_tables LOOP
    EXECUTE format($f$
      CREATE POLICY "Owners can select own rows" ON public.%I
        FOR SELECT TO authenticated
        USING (user_id = (auth.uid())::text);
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owners can insert own rows" ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (user_id = (auth.uid())::text);
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owners can update own rows" ON public.%I
        FOR UPDATE TO authenticated
        USING (user_id = (auth.uid())::text)
        WITH CHECK (user_id = (auth.uid())::text);
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owners can delete own rows" ON public.%I
        FOR DELETE TO authenticated
        USING (user_id = (auth.uid())::text);
    $f$, t);
  END LOOP;
END $$;

-- Revoke anon access on user-scoped tables (defense in depth)
REVOKE ALL ON public.activity_sessions, public.audio_story_listens, public.chat_messages,
  public.comic_books, public.daily_goals, public.daily_login_rewards, public.flashcards,
  public.game_scores, public.user_achievements, public.user_daily_challenge_progress,
  public.user_progress, public.user_purchases, public.writing_exercises FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.activity_sessions, public.audio_story_listens, public.chat_messages,
  public.comic_books, public.daily_goals, public.daily_login_rewards, public.flashcards,
  public.game_scores, public.user_achievements, public.user_daily_challenge_progress,
  public.user_progress, public.user_purchases, public.writing_exercises
TO authenticated;

-- daily_challenges: readable to signed-in users, writes only via service_role
CREATE POLICY "Authenticated can read challenges" ON public.daily_challenges
  FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.daily_challenges FROM anon;
GRANT SELECT ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
