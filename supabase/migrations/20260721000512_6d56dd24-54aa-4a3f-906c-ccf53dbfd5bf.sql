
-- 1. Anonymized queue + handshake columns
ALTER TABLE public.triage_sessions
  ADD COLUMN IF NOT EXISTS age_band text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS symptom_category text,
  ADD COLUMN IF NOT EXISTS requested_by uuid,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS patient_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_last_name text,
  ADD COLUMN IF NOT EXISTS provider_license text;

-- 2. Private reports table
CREATE TABLE IF NOT EXISTS public.triage_reports (
  triage_session_id uuid PRIMARY KEY REFERENCES public.triage_sessions(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triage_reports TO authenticated;
GRANT ALL ON public.triage_reports TO service_role;
ALTER TABLE public.triage_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient manages own report" ON public.triage_reports;
CREATE POLICY "patient manages own report" ON public.triage_reports
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "doctor reads report after accept" ON public.triage_reports;
CREATE POLICY "doctor reads report after accept" ON public.triage_reports
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.triage_sessions s
    WHERE s.id = triage_session_id
      AND s.doctor_id = auth.uid()
      AND s.patient_accepted_at IS NOT NULL
      AND s.status IN ('claimed','concluded')
  ));

-- 3. Migrate existing reports out of triage_sessions
INSERT INTO public.triage_reports (triage_session_id, patient_id, report)
SELECT id, patient_id, interaction_report
FROM public.triage_sessions
WHERE interaction_report IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.triage_sessions DROP COLUMN IF EXISTS interaction_report;

-- 4. Tighten triage_sessions RLS for provider access
DROP POLICY IF EXISTS "Providers can view waiting sessions" ON public.triage_sessions;
DROP POLICY IF EXISTS "Doctor updates claimed session" ON public.triage_sessions;
DROP POLICY IF EXISTS "Verified providers view queue" ON public.triage_sessions;
DROP POLICY IF EXISTS "Doctor updates own session" ON public.triage_sessions;

CREATE POLICY "Verified providers view queue" ON public.triage_sessions
  FOR SELECT USING (
    public.is_verified_provider(auth.uid()) AND (
      (status = 'waiting' AND pin_expires_at > now())
      OR doctor_id  = auth.uid()
      OR requested_by = auth.uid()
    )
  );

CREATE POLICY "Doctor updates own session" ON public.triage_sessions
  FOR UPDATE USING (
    doctor_id = auth.uid() OR requested_by = auth.uid()
  ) WITH CHECK (
    doctor_id = auth.uid() OR requested_by = auth.uid()
  );

-- 5. Follow-up ticket table
CREATE TABLE IF NOT EXISTS public.followup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_session_id uuid REFERENCES public.triage_sessions(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  doctor_last_name text,
  doctor_license text,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemed_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.followup_tokens TO authenticated;
GRANT ALL ON public.followup_tokens TO service_role;
ALTER TABLE public.followup_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants view token" ON public.followup_tokens;
CREATE POLICY "participants view token" ON public.followup_tokens
  FOR SELECT USING (auth.uid() IN (patient_id, doctor_id));

-- 6. Doctor requests a queue patient (optimistic atomic lock)
CREATE OR REPLACE FUNCTION public.request_triage(_session_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _name text;
  _last text;
  _lic text;
  _out uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.is_verified_provider(_uid) THEN RAISE EXCEPTION 'not a verified provider'; END IF;

  SELECT display_name INTO _name FROM public.profiles WHERE user_id = _uid;
  _name := COALESCE(_name, 'Doctor');
  _last := (regexp_split_to_array(_name, '\s+'))[array_length(regexp_split_to_array(_name, '\s+'), 1)];

  SELECT COALESCE(raw_user_meta_data->>'license_number', 'MDCN')
    INTO _lic FROM auth.users WHERE id = _uid;

  UPDATE public.triage_sessions
     SET requested_by = _uid,
         requested_at = now(),
         provider_last_name = _last,
         provider_license   = _lic,
         updated_at = now()
   WHERE id = _session_id
     AND status = 'waiting'
     AND (requested_by IS NULL OR requested_at < now() - interval '30 seconds')
     AND pin_expires_at > now()
   RETURNING id INTO _out;

  IF _out IS NULL THEN RAISE EXCEPTION 'already requested by another doctor'; END IF;
  RETURN _out;
END $$;
GRANT EXECUTE ON FUNCTION public.request_triage(uuid) TO authenticated;

-- 7. Patient accepts the requesting doctor
CREATE OR REPLACE FUNCTION public.accept_triage(_session_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _req uuid; _out uuid;
BEGIN
  SELECT requested_by INTO _req FROM public.triage_sessions
   WHERE id = _session_id AND patient_id = _uid AND status = 'waiting';
  IF _req IS NULL THEN RAISE EXCEPTION 'no pending request'; END IF;

  UPDATE public.triage_sessions
     SET doctor_id = _req,
         status = 'claimed',
         claimed_at = now(),
         patient_accepted_at = now(),
         triage_pin = NULL,
         updated_at = now()
   WHERE id = _session_id
   RETURNING id INTO _out;
  RETURN _out;
END $$;
GRANT EXECUTE ON FUNCTION public.accept_triage(uuid) TO authenticated;

-- 8. Patient declines the requesting doctor
CREATE OR REPLACE FUNCTION public.decline_triage(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.triage_sessions
     SET requested_by = NULL, requested_at = NULL,
         provider_last_name = NULL, provider_license = NULL,
         updated_at = now()
   WHERE id = _session_id AND patient_id = auth.uid() AND status='waiting';
END $$;
GRANT EXECUTE ON FUNCTION public.decline_triage(uuid) TO authenticated;

-- 9. Doctor issues a 72h follow-up token
CREATE OR REPLACE FUNCTION public.issue_followup_token(_session_id uuid, _hours int DEFAULT 72)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
  _last text;
  _lic  text;
  _name text;
  _tok text := encode(gen_random_bytes(9), 'hex');
BEGIN
  SELECT patient_id INTO _pid FROM public.triage_sessions
   WHERE id = _session_id AND doctor_id = _uid;
  IF _pid IS NULL THEN RAISE EXCEPTION 'not authorized for this session'; END IF;

  SELECT display_name INTO _name FROM public.profiles WHERE user_id = _uid;
  _name := COALESCE(_name, 'Doctor');
  _last := (regexp_split_to_array(_name, '\s+'))[array_length(regexp_split_to_array(_name, '\s+'), 1)];
  SELECT COALESCE(raw_user_meta_data->>'license_number','MDCN')
    INTO _lic FROM auth.users WHERE id = _uid;

  INSERT INTO public.followup_tokens
    (triage_session_id, patient_id, doctor_id, doctor_last_name, doctor_license, token, expires_at)
  VALUES
    (_session_id, _pid, _uid, _last, _lic, _tok, now() + make_interval(hours => _hours));

  RETURN _tok;
END $$;
GRANT EXECUTE ON FUNCTION public.issue_followup_token(uuid, int) TO authenticated;

-- 10. Patient redeems follow-up ticket -> new claimed session
CREATE OR REPLACE FUNCTION public.redeem_followup_token(_token_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _tok public.followup_tokens;
  _new uuid;
  _rep jsonb;
BEGIN
  SELECT * INTO _tok FROM public.followup_tokens WHERE id = _token_id AND patient_id = _uid;
  IF _tok IS NULL THEN RAISE EXCEPTION 'invalid ticket'; END IF;
  IF _tok.redeemed_at IS NOT NULL THEN RAISE EXCEPTION 'already used'; END IF;
  IF _tok.expires_at < now() THEN RAISE EXCEPTION 'ticket expired'; END IF;

  INSERT INTO public.triage_sessions
    (patient_id, doctor_id, status, claimed_at, patient_accepted_at,
     triage_pin, pin_expires_at, age_band, gender, symptom_category,
     provider_last_name, provider_license)
  SELECT patient_id, _tok.doctor_id, 'claimed', now(), now(),
         NULL, now() + interval '2 hours',
         age_band, gender, symptom_category,
         _tok.doctor_last_name, _tok.doctor_license
    FROM public.triage_sessions WHERE id = _tok.triage_session_id
  RETURNING id INTO _new;

  SELECT report INTO _rep FROM public.triage_reports WHERE triage_session_id = _tok.triage_session_id;
  IF _rep IS NOT NULL THEN
    INSERT INTO public.triage_reports (triage_session_id, patient_id, report)
      VALUES (_new, _uid, _rep);
  END IF;

  UPDATE public.followup_tokens SET redeemed_at = now(), redeemed_session_id = _new WHERE id = _token_id;
  RETURN _new;
END $$;
GRANT EXECUTE ON FUNCTION public.redeem_followup_token(uuid) TO authenticated;

-- 11. Realtime (idempotent)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.followup_tokens;  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
