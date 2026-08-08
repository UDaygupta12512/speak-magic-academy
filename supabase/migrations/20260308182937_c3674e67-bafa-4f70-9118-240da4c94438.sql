
-- Add coins column to user_progress
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;

-- Create user_purchases table for tracking bought shop items
CREATE TABLE public.user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL DEFAULT 'power_up',
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their purchases" ON public.user_purchases
  FOR SELECT USING (true);

CREATE POLICY "Users can insert purchases" ON public.user_purchases
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their purchases" ON public.user_purchases
  FOR UPDATE USING (true);
