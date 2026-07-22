
-- 1) Demo Verification Bypass RPC (grants provider role + demo hospital membership)
CREATE OR REPLACE FUNCTION public.demo_bypass_verification()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _h uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT id INTO _h FROM public.hospitals WHERE slug = 'medp-ai-demo-clinic' LIMIT 1;
  IF _h IS NULL THEN
    INSERT INTO public.hospitals(name, slug) VALUES ('MedP-AI Demo Clinic','medp-ai-demo-clinic')
    RETURNING id INTO _h;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'provider') ON CONFLICT DO NOTHING;
  INSERT INTO public.hospital_providers(hospital_id, user_id, status, grant_method, approved_at)
    VALUES (_h, _uid, 'active', 'qr_geofence', now())
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.demo_bypass_verification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_bypass_verification() TO authenticated;

-- Same idea for pharmacists
CREATE OR REPLACE FUNCTION public.demo_bypass_pharmacist()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT id INTO _pid FROM public.pharmacies WHERE owner_user_id = _uid LIMIT 1;
  IF _pid IS NULL THEN
    INSERT INTO public.pharmacies(owner_user_id, name, is_verified, is_on_duty)
      VALUES (_uid, 'Demo Pharmacy', true, true)
    RETURNING id INTO _pid;
  ELSE
    UPDATE public.pharmacies SET is_verified = true WHERE id = _pid;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'pharmacist') ON CONFLICT DO NOTHING;
  RETURN _pid;
END $$;
REVOKE ALL ON FUNCTION public.demo_bypass_pharmacist() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_bypass_pharmacist() TO authenticated;

-- 2) Consultation chat messages (patient <-> doctor, gated on patient acceptance)
CREATE TABLE public.consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_session_id uuid NOT NULL REFERENCES public.triage_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('doctor','patient')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consult_msg_session ON public.consultation_messages(triage_session_id, created_at);
GRANT SELECT, INSERT ON public.consultation_messages TO authenticated;
GRANT ALL ON public.consultation_messages TO service_role;
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consult participants can read"
ON public.consultation_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.triage_sessions ts
  WHERE ts.id = triage_session_id
    AND (ts.patient_id = auth.uid() OR ts.doctor_id = auth.uid())
    AND ts.patient_accepted_at IS NOT NULL
));

CREATE POLICY "Consult participants can send"
ON public.consultation_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.triage_sessions ts
    WHERE ts.id = triage_session_id
      AND ts.patient_accepted_at IS NOT NULL
      AND ts.status = 'claimed'
      AND (
        (ts.patient_id = auth.uid() AND sender_role = 'patient') OR
        (ts.doctor_id  = auth.uid() AND sender_role = 'doctor')
      )
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages;
