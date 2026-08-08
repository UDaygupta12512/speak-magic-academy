
CREATE TABLE public.daily_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  goal_date date NOT NULL DEFAULT CURRENT_DATE,
  xp_target integer NOT NULL DEFAULT 100,
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, goal_date)
);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON public.daily_goals FOR SELECT USING (true);
CREATE POLICY "Users can insert their own goals" ON public.daily_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own goals" ON public.daily_goals FOR UPDATE USING (true);
