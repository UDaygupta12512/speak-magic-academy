
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_progress','daily_login_rewards','daily_goals','activity_sessions',
    'flashcards','game_scores','chat_messages','audio_story_listens','comic_books'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Owners can select own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners can insert own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners can update own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners can delete own rows" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Device users can read" ON public.%I FOR SELECT USING (user_id IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "Device users can insert" ON public.%I FOR INSERT WITH CHECK (user_id IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "Device users can update" ON public.%I FOR UPDATE USING (user_id IS NOT NULL) WITH CHECK (user_id IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "Device users can delete" ON public.%I FOR DELETE USING (user_id IS NOT NULL)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
