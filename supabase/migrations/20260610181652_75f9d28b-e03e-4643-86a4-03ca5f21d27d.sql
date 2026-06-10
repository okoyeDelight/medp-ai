
ALTER TABLE public.consultation_sessions
  ALTER COLUMN pin DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='consultation_sessions_status_chk') THEN
    ALTER TABLE public.consultation_sessions
      ADD CONSTRAINT consultation_sessions_status_chk CHECK (status IN ('active','terminated'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.patient_heartbeat(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.consultation_sessions
     SET last_heartbeat = now()
   WHERE id = _session_id
     AND patient_id = auth.uid()
     AND status = 'active'
     AND revoked_at IS NULL
     AND pin_expires_at > now();
END; $$;
REVOKE ALL ON FUNCTION public.patient_heartbeat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patient_heartbeat(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.terminate_if_stale(_session_id uuid)
RETURNS TABLE (status text, terminated boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.consultation_sessions;
  did_terminate boolean := false;
BEGIN
  SELECT * INTO s FROM public.consultation_sessions WHERE id = _session_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'unknown'::text, false; RETURN;
  END IF;
  IF auth.uid() IS DISTINCT FROM s.patient_id AND auth.uid() IS DISTINCT FROM s.provider_id THEN
    RETURN QUERY SELECT s.status, false; RETURN;
  END IF;
  IF s.status = 'active'
     AND (s.last_heartbeat < now() - interval '120 seconds'
          OR s.pin_expires_at < now()
          OR s.revoked_at IS NOT NULL) THEN
    UPDATE public.consultation_sessions
       SET status = 'terminated', pin = NULL, revoked_at = COALESCE(revoked_at, now())
     WHERE id = _session_id;
    did_terminate := true;
    s.status := 'terminated';
  END IF;
  RETURN QUERY SELECT s.status, did_terminate;
END; $$;
REVOKE ALL ON FUNCTION public.terminate_if_stale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.terminate_if_stale(uuid) TO authenticated;

INSERT INTO public.hospitals (id, name, slug, latitude, longitude, geofence_radius_m)
SELECT gen_random_uuid(), 'MedP-AI Demo Clinic', 'medp-ai-demo', 6.5244, 3.3792, 500
WHERE NOT EXISTS (SELECT 1 FROM public.hospitals);

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='consultation_sessions';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_sessions';
  END IF;
  PERFORM 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='vitals_logs';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals_logs';
  END IF;
END $$;

ALTER TABLE public.consultation_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.vitals_logs REPLICA IDENTITY FULL;
