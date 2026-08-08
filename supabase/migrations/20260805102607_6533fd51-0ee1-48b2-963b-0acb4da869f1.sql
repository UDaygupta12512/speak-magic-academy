DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_progress','flashcards','chat_messages','game_scores','daily_goals','daily_login_rewards','activity_sessions','audio_story_listens','comic_books','writing_exercises','user_achievements','user_daily_challenge_progress','user_purchases']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Device users can read" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Device users can insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Device users can update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Device users can delete" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners can select own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners can insert own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners can update own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners can delete own rows" ON public.%I', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Owners can select own rows" ON public.%I FOR SELECT TO authenticated USING (user_id = (auth.uid())::text)', t);
    EXECUTE format('CREATE POLICY "Owners can insert own rows" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text)', t);
    EXECUTE format('CREATE POLICY "Owners can update own rows" ON public.%I FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text)', t);
    EXECUTE format('CREATE POLICY "Owners can delete own rows" ON public.%I FOR DELETE TO authenticated USING (user_id = (auth.uid())::text)', t);
  END LOOP;
END $$;