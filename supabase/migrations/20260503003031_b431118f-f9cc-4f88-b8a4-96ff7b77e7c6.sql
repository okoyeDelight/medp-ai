-- Current score per user
CREATE TABLE public.health_safety_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 70,
  wellness_points INTEGER NOT NULL DEFAULT 0,
  premium_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_safety_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own score"
  ON public.health_safety_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own score"
  ON public.health_safety_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own score"
  ON public.health_safety_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own score"
  ON public.health_safety_scores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_health_safety_scores_updated_at
  BEFORE UPDATE ON public.health_safety_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Score change history
CREATE TABLE public.safety_score_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_safety_score_events_user_created
  ON public.safety_score_events(user_id, created_at DESC);

ALTER TABLE public.safety_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own score events"
  ON public.safety_score_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own score events"
  ON public.safety_score_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own score events"
  ON public.safety_score_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);