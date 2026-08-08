CREATE TABLE public.audio_story_listens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  story_title TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audio_story_listens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own audio story listens"
ON public.audio_story_listens FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own audio story listens"
ON public.audio_story_listens FOR SELECT
USING (true);

CREATE INDEX idx_audio_story_listens_user_created
  ON public.audio_story_listens (user_id, created_at DESC);