
ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS hours_open TIME,
  ADD COLUMN IF NOT EXISTS hours_close TIME,
  ADD COLUMN IF NOT EXISTS auto_duty BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'free' CHECK (pricing_mode IN ('free','paid')),
  ADD COLUMN IF NOT EXISTS price_naira INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quick_replies TEXT[] NOT NULL DEFAULT ARRAY[
    'Hello, I''ve received your clinical context. How are you feeling now?',
    'Please pause the herbal intake until we review the interaction.',
    'Take with food and 1 full glass of water.',
    'If symptoms worsen within 2 hours, go to the nearest hospital.',
    'I''m recommending you stop this combination immediately.'
  ]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_pcs_pharmacist_status ON public.pharmacy_chat_sessions(pharmacist_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pcs_pharmacist_ended ON public.pharmacy_chat_sessions(pharmacist_user_id, ended_at DESC);
