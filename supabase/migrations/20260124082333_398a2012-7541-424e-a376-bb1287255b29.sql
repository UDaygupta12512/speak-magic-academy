-- Create user_achievements table to track earned badges
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies (open for now, will be user-specific when auth is added)
CREATE POLICY "Users can view achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);

-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example_sentence TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  next_review_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their flashcards" ON public.flashcards FOR SELECT USING (true);
CREATE POLICY "Users can create flashcards" ON public.flashcards FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update flashcards" ON public.flashcards FOR UPDATE USING (true);
CREATE POLICY "Users can delete flashcards" ON public.flashcards FOR DELETE USING (true);

-- Create daily_challenges table
CREATE TABLE public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challenge_type TEXT NOT NULL,
  challenge_data JSONB NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_date, challenge_type)
);

-- Enable RLS
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view daily challenges" ON public.daily_challenges FOR SELECT USING (true);
CREATE POLICY "System can create challenges" ON public.daily_challenges FOR INSERT WITH CHECK (true);

-- Create user_daily_challenge_progress table
CREATE TABLE public.user_daily_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.user_daily_challenge_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their challenge progress" ON public.user_daily_challenge_progress FOR SELECT USING (true);
CREATE POLICY "Users can update their challenge progress" ON public.user_daily_challenge_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can modify their progress" ON public.user_daily_challenge_progress FOR UPDATE USING (true);

-- Create writing_exercises table
CREATE TABLE public.writing_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  user_response TEXT NOT NULL,
  ai_feedback TEXT,
  grammar_score INTEGER,
  creativity_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.writing_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their writing exercises" ON public.writing_exercises FOR SELECT USING (true);
CREATE POLICY "Users can create writing exercises" ON public.writing_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update exercises" ON public.writing_exercises FOR UPDATE USING (true);

-- Add trigger for flashcards updated_at
CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();