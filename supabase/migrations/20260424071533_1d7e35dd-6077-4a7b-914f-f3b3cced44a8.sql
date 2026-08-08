CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 100
  AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  AND length(trim(subject)) BETWEEN 1 AND 120
  AND length(trim(message)) BETWEEN 1 AND 1000
);

CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);
CREATE INDEX idx_support_messages_status ON public.support_messages(status);