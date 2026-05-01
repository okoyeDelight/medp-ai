-- Vitals logs table
CREATE TABLE public.vitals_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pulse_bpm INTEGER,
  systolic INTEGER,
  diastolic INTEGER,
  signal_quality TEXT,
  source TEXT NOT NULL DEFAULT 'camera',
  notes TEXT,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vitals_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view own vitals logs"
  ON public.vitals_logs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users insert own vitals logs"
  ON public.vitals_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users update own vitals logs"
  ON public.vitals_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users delete own vitals logs"
  ON public.vitals_logs FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_vitals_logs_user_measured ON public.vitals_logs (user_id, measured_at DESC);

-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_conditions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS active_medications TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS hmo_provider TEXT,
  ADD COLUMN IF NOT EXISTS hmo_member_id TEXT,
  ADD COLUMN IF NOT EXISTS privacy_guard BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_acknowledged_at TIMESTAMP WITH TIME ZONE;

-- Update delete_my_account to also wipe vitals
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.dose_logs WHERE user_id = uid;
  DELETE FROM public.vitals_logs WHERE user_id = uid;
  DELETE FROM public.profiles WHERE user_id = uid;
END;
$$;