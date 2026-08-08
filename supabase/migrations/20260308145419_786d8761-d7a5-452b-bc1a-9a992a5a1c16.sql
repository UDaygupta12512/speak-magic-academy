ALTER TABLE public.user_progress ADD COLUMN streak_freezes integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_progress ADD COLUMN streak_freeze_used_date date DEFAULT NULL;