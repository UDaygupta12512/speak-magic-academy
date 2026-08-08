CREATE TABLE public.daily_login_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  day_number integer NOT NULL DEFAULT 1,
  reward_type text NOT NULL DEFAULT 'xp',
  reward_value integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_date)
);

ALTER TABLE public.daily_login_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login rewards" ON public.daily_login_rewards
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own login rewards" ON public.daily_login_rewards
  FOR INSERT WITH CHECK (true);