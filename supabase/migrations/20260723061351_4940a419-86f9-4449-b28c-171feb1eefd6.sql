
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.migrate_anonymous_data(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrate_anonymous_data(TEXT) TO authenticated;
