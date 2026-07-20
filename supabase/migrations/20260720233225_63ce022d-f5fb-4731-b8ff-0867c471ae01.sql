
-- ============================================================
-- 1. TRIAGE SESSIONS (Patient generates 4-digit PIN, Doctor claims)
-- ============================================================
CREATE TABLE public.triage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  triage_pin TEXT,
  pin_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  concluded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','claimed','concluded','cancelled','expired')),
  interaction_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_triage_pin_active ON public.triage_sessions (triage_pin)
  WHERE status = 'waiting';
CREATE INDEX idx_triage_patient ON public.triage_sessions (patient_id, created_at DESC);
CREATE INDEX idx_triage_doctor ON public.triage_sessions (doctor_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.triage_sessions TO authenticated;
GRANT ALL ON public.triage_sessions TO service_role;

ALTER TABLE public.triage_sessions ENABLE ROW LEVEL SECURITY;

-- Patient owns their session
CREATE POLICY "Patients read own triage" ON public.triage_sessions
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Patients create triage" ON public.triage_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients update own triage" ON public.triage_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Verified providers can see claimed sessions they own AND active waiting rows (needed to claim by PIN via RPC-less lookup won't leak because we redact server-side).
-- We do NOT expose the pin column to anyone but the patient. Column-level protection: put pin only in a view. For MVP, restrict SELECT of waiting rows entirely to patient; doctor claim happens via SECURITY DEFINER RPC below.
CREATE POLICY "Providers read own claimed triage" ON public.triage_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id AND public.is_verified_provider(auth.uid()));
CREATE POLICY "Providers update own claimed triage" ON public.triage_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id AND public.is_verified_provider(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id);

-- ============================================================
-- 2. PHARMACY HANDOFFS (Doctor -> Pharmacy transfer w/ Dispense PIN)
-- ============================================================
CREATE TABLE public.pharmacy_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_session_id UUID NOT NULL REFERENCES public.triage_sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  pharmacist_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispense_pin TEXT NOT NULL,
  prescription JSONB,
  interaction_report JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','ready','dispensed','cancelled')),
  accepted_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  dispensed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_handoff_pharmacist ON public.pharmacy_handoffs (pharmacist_user_id, status, created_at DESC);
CREATE INDEX idx_handoff_patient ON public.pharmacy_handoffs (patient_id, created_at DESC);
CREATE INDEX idx_handoff_doctor ON public.pharmacy_handoffs (doctor_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.pharmacy_handoffs TO authenticated;
GRANT ALL ON public.pharmacy_handoffs TO service_role;

ALTER TABLE public.pharmacy_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Handoff parties read" ON public.pharmacy_handoffs
  FOR SELECT TO authenticated
  USING (auth.uid() IN (patient_id, doctor_id, pharmacist_user_id));
CREATE POLICY "Doctor creates handoff" ON public.pharmacy_handoffs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = doctor_id AND public.is_verified_provider(auth.uid()));
CREATE POLICY "Doctor updates handoff" ON public.pharmacy_handoffs
  FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Pharmacist updates handoff" ON public.pharmacy_handoffs
  FOR UPDATE TO authenticated
  USING (auth.uid() = pharmacist_user_id) WITH CHECK (auth.uid() = pharmacist_user_id);

-- ============================================================
-- 3. DOCTOR <-> PHARMACIST CHAT (per handoff)
-- ============================================================
CREATE TABLE public.doctor_pharmacist_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES public.pharmacy_handoffs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('doctor','pharmacist','system')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dpm_handoff ON public.doctor_pharmacist_messages (handoff_id, created_at);

GRANT SELECT, INSERT ON public.doctor_pharmacist_messages TO authenticated;
GRANT ALL ON public.doctor_pharmacist_messages TO service_role;

ALTER TABLE public.doctor_pharmacist_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_handoff_clinician(_handoff_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_handoffs h
    WHERE h.id = _handoff_id
      AND auth.uid() IN (h.doctor_id, h.pharmacist_user_id)
  )
$$;
REVOKE ALL ON FUNCTION public.is_handoff_clinician(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_handoff_clinician(UUID) TO authenticated;

CREATE POLICY "Clinicians read handoff chat" ON public.doctor_pharmacist_messages
  FOR SELECT TO authenticated USING (public.is_handoff_clinician(handoff_id));
CREATE POLICY "Clinicians write handoff chat" ON public.doctor_pharmacist_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_handoff_clinician(handoff_id) AND sender_id = auth.uid());

-- ============================================================
-- 4. TRIAGE DOCUMENTS (Dual PDF outputs)
-- ============================================================
CREATE TABLE public.triage_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES public.pharmacy_handoffs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('patient','clinical')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_docs_handoff ON public.triage_documents (handoff_id, kind);

GRANT SELECT, INSERT ON public.triage_documents TO authenticated;
GRANT ALL ON public.triage_documents TO service_role;

ALTER TABLE public.triage_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties read triage docs" ON public.triage_documents
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_handoffs h
      WHERE h.id = handoff_id AND (
        (triage_documents.kind = 'patient' AND auth.uid() = h.patient_id) OR
        (auth.uid() IN (h.doctor_id, h.pharmacist_user_id))
      )
    )
  );
CREATE POLICY "Clinicians insert triage docs" ON public.triage_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pharmacy_handoffs h
      WHERE h.id = handoff_id AND auth.uid() IN (h.doctor_id, h.pharmacist_user_id)
    )
  );

-- ============================================================
-- 5. SECURITY DEFINER RPCs
-- ============================================================

-- Doctor claims a triage PIN. Returns the session id on success.
CREATE OR REPLACE FUNCTION public.claim_triage_pin(_pin TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _hospital UUID;
  _session public.triage_sessions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.is_verified_provider(_uid) THEN
    RAISE EXCEPTION 'not a verified provider';
  END IF;
  _hospital := public.provider_hospital_id(_uid);

  SELECT * INTO _session FROM public.triage_sessions
    WHERE triage_pin = _pin
      AND status = 'waiting'
      AND pin_expires_at > now()
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid or expired PIN';
  END IF;

  UPDATE public.triage_sessions
    SET doctor_id = _uid,
        hospital_id = COALESCE(_hospital, hospital_id),
        claimed_at = now(),
        status = 'claimed',
        triage_pin = NULL,
        updated_at = now()
    WHERE id = _session.id;

  RETURN _session.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_triage_pin(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_triage_pin(TEXT) TO authenticated;

-- Expire stale waiting sessions (called opportunistically by clients).
CREATE OR REPLACE FUNCTION public.expire_stale_triage()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n INT;
BEGIN
  UPDATE public.triage_sessions
    SET status = 'expired', triage_pin = NULL, updated_at = now()
    WHERE status = 'waiting' AND pin_expires_at < now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.expire_stale_triage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stale_triage() TO authenticated;

-- ============================================================
-- 6. TRIGGERS FOR updated_at
-- ============================================================
CREATE TRIGGER trg_triage_updated
  BEFORE UPDATE ON public.triage_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_handoff_updated
  BEFORE UPDATE ON public.pharmacy_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_handoffs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_pharmacist_messages;
