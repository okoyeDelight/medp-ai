-- ─────────────────────────────────────────────────────────────────────────────
-- Hyper-Local Telepharmacy Network — Schema + RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. PHARMACIES ───────────────────────────────────────────────────────────────
CREATE TABLE public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  is_licensed_pharmacy BOOLEAN NOT NULL DEFAULT false,
  duty_status TEXT NOT NULL DEFAULT 'offline' CHECK (duty_status IN ('online','offline')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id)
);
CREATE INDEX idx_pharmacies_discovery
  ON public.pharmacies(duty_status, is_licensed_pharmacy)
  WHERE duty_status = 'online' AND is_licensed_pharmacy = true;

GRANT SELECT ON public.pharmacies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can discover ONLY licensed + online pharmacies
CREATE POLICY "Public can discover online licensed pharmacies"
  ON public.pharmacies FOR SELECT
  USING (is_licensed_pharmacy = true AND duty_status = 'online');

-- Owner can always read their own row
CREATE POLICY "Owner reads own pharmacy"
  ON public.pharmacies FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

-- Owner can create / update / delete their own pharmacy
CREATE POLICY "Owner inserts own pharmacy"
  ON public.pharmacies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owner updates own pharmacy"
  ON public.pharmacies FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Owner deletes own pharmacy"
  ON public.pharmacies FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE TRIGGER trg_pharmacies_updated
  BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. CHAT SESSIONS ───────────────────────────────────────────────────────────
CREATE TABLE public.pharmacy_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  pharmacist_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','ended','declined')),
  interaction_report JSONB,
  archived_transcript JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pchat_sessions_pharmacist ON public.pharmacy_chat_sessions(pharmacist_user_id, status);
CREATE INDEX idx_pchat_sessions_patient    ON public.pharmacy_chat_sessions(patient_id, status);

GRANT SELECT, INSERT, UPDATE ON public.pharmacy_chat_sessions TO authenticated;
GRANT ALL ON public.pharmacy_chat_sessions TO service_role;

ALTER TABLE public.pharmacy_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller a participant in the session?
CREATE OR REPLACE FUNCTION public.is_pharmacy_chat_participant(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_chat_sessions
    WHERE id = _session_id
      AND (patient_id = auth.uid() OR pharmacist_user_id = auth.uid())
  )
$$;

CREATE POLICY "Participants read session"
  ON public.pharmacy_chat_sessions FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR pharmacist_user_id = auth.uid());

-- Patient can open a session, must point pharmacist_user_id at the pharmacy owner
CREATE POLICY "Patient initiates session"
  ON public.pharmacy_chat_sessions FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    AND pharmacist_user_id = (
      SELECT owner_user_id FROM public.pharmacies
       WHERE id = pharmacy_id
         AND is_licensed_pharmacy = true
         AND duty_status = 'online'
    )
  );

-- Either party can update (accept / end / decline). Status transitions guarded in app.
CREATE POLICY "Participants update session"
  ON public.pharmacy_chat_sessions FOR UPDATE TO authenticated
  USING (patient_id = auth.uid() OR pharmacist_user_id = auth.uid())
  WITH CHECK (patient_id = auth.uid() OR pharmacist_user_id = auth.uid());

CREATE TRIGGER trg_pchat_sessions_updated
  BEFORE UPDATE ON public.pharmacy_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. CHAT MESSAGES ───────────────────────────────────────────────────────────
CREATE TABLE public.pharmacy_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.pharmacy_chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('patient','pharmacist','system')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pchat_messages_session ON public.pharmacy_chat_messages(session_id, created_at);

GRANT SELECT, INSERT ON public.pharmacy_chat_messages TO authenticated;
GRANT ALL ON public.pharmacy_chat_messages TO service_role;

ALTER TABLE public.pharmacy_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read messages"
  ON public.pharmacy_chat_messages FOR SELECT TO authenticated
  USING (public.is_pharmacy_chat_participant(session_id));

-- Sender must be a participant, role must match their seat, session must be active,
-- and system messages may only be inserted by edge functions / service role.
CREATE POLICY "Participants send messages"
  ON public.pharmacy_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role IN ('patient','pharmacist')
    AND EXISTS (
      SELECT 1 FROM public.pharmacy_chat_sessions s
       WHERE s.id = session_id
         AND s.status = 'active'
         AND (
           (sender_role = 'patient'    AND s.patient_id          = auth.uid()) OR
           (sender_role = 'pharmacist' AND s.pharmacist_user_id  = auth.uid())
         )
    )
  );


-- 4. REALTIME ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_chat_messages;