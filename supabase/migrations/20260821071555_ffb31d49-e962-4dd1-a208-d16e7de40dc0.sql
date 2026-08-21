-- 1. Private allowlist (server-side source of truth, readable only by service_role / definer fns)
CREATE TABLE public.owner_preview_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.owner_preview_allowlist TO service_role;
ALTER TABLE public.owner_preview_allowlist ENABLE ROW LEVEL SECURITY;
-- no policies for anon/authenticated: not reachable from the client at all

INSERT INTO public.owner_preview_allowlist (email, note)
VALUES ('chinedubisiola04@gmail.com', 'Founder / owner development preview')
ON CONFLICT (email) DO NOTHING;

-- 2. Audit trail separating owner preview access from real provider access
CREATE TABLE public.owner_preview_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  action text NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.owner_preview_audit TO authenticated;
GRANT ALL ON public.owner_preview_audit TO service_role;
ALTER TABLE public.owner_preview_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read own preview audit"
  ON public.owner_preview_audit FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX idx_owner_preview_audit_user ON public.owner_preview_audit(user_id, created_at DESC);

-- 3. Server-side check: is the signed-in user an owner previewer?
CREATE OR REPLACE FUNCTION public.is_owner_preview(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.owner_preview_allowlist a
      ON lower(u.email) = lower(a.email)
    WHERE u.id = _user_id
      AND u.email_confirmed_at IS NOT NULL
  )
$$;
REVOKE ALL ON FUNCTION public.is_owner_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner_preview(uuid) TO authenticated, service_role;

-- 4. Provision owner preview access (idempotent, audited, self-only)
CREATE OR REPLACE FUNCTION public.start_owner_preview()
RETURNS TABLE(hospital_id uuid, hospital_name text, is_owner_preview boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _h uuid;
  _hname text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.is_owner_preview(_uid) THEN
    RAISE EXCEPTION 'not authorized for owner preview';
  END IF;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _uid;

  SELECT h.id, h.name INTO _h, _hname
    FROM public.hospitals h WHERE h.slug = 'medp-ai-demo-clinic' LIMIT 1;
  IF _h IS NULL THEN
    INSERT INTO public.hospitals (name, slug)
      VALUES ('MedP-AI Demo Clinic', 'medp-ai-demo-clinic')
      RETURNING id, name INTO _h, _hname;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'provider')
    ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.hospital_providers hp
     WHERE hp.user_id = _uid AND hp.hospital_id = _h
  ) THEN
    INSERT INTO public.hospital_providers
      (hospital_id, user_id, status, grant_method, approved_at)
    VALUES (_h, _uid, 'active', 'admin_approve', now());
  ELSE
    UPDATE public.hospital_providers
       SET status = 'active', approved_at = COALESCE(approved_at, now()), updated_at = now()
     WHERE user_id = _uid AND hospital_id = _h AND status <> 'active';
  END IF;

  INSERT INTO public.owner_preview_audit (user_id, email, action, hospital_id)
    VALUES (_uid, _email, 'owner_preview_activated', _h);

  RETURN QUERY SELECT _h, _hname, true;
END $$;
REVOKE ALL ON FUNCTION public.start_owner_preview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_owner_preview() TO authenticated;