
CREATE TABLE public.comic_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  hero TEXT NOT NULL DEFAULT '',
  idea TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en',
  page_count INTEGER NOT NULL DEFAULT 0,
  panels JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_comic_books_user ON public.comic_books(user_id, updated_at DESC);

ALTER TABLE public.comic_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their comics" ON public.comic_books FOR SELECT USING (true);
CREATE POLICY "Users can insert comics" ON public.comic_books FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their comics" ON public.comic_books FOR UPDATE USING (true);
CREATE POLICY "Users can delete their comics" ON public.comic_books FOR DELETE USING (true);

CREATE TRIGGER update_comic_books_updated_at
BEFORE UPDATE ON public.comic_books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
