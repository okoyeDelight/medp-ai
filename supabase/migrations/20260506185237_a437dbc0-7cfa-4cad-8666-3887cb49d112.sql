-- ============================================================
-- MedP-AI · Clinical Integration & Security Infrastructure
-- Phase 1: Roles, Hospitals, QR Onboarding, Geofence, Handshake
-- ============================================================

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('patient', 'provider', 'hospital_admin', 'platform_admin');

CREATE TYPE public.provider_status AS ENUM (
  'pending_verification', -- new, view-only, no patient data
  'temporary',            -- 48h passive-QR access
  'active',               -- permanent (implicit QR / admin-approved / whitelist)
  'revoked'
);

CREATE TYPE public.provider_grant_method AS ENUM (
  'implicit_qr',   -- scanned admin's rotating QR (within geofence)
  'passive_qr',   -- scanned static poster QR (within geofence) → 48h temp
  'whitelist',     -- admin pasted email/phone
  'admin_approve', -- manually approved by admin
  'staff_id'       -- approved via staff ID photo
);

CREATE TYPE public.qr_kind AS ENUM ('rotating', 'static');

-- ---------- USER ROLES ----------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---------- HOSPITALS ----------
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  -- Registered coords for geofence (500m radius)
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geofence_radius_m INTEGER NOT NULL DEFAULT 500,
  emergency_dial TEXT NOT NULL DEFAULT '112',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Hospitals are a public directory (patients pick from a list)
CREATE POLICY "Anyone can view hospitals" ON public.hospitals
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_hospitals_updated
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- WARDS (departments) ----------
CREATE TABLE public.hospital_wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, name)
);
ALTER TABLE public.hospital_wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view wards" ON public.hospital_wards
  FOR SELECT TO authenticated USING (true);

-- ---------- HOSPITAL ADMINS ----------
CREATE TABLE public.hospital_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, user_id)
);
ALTER TABLE public.hospital_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_hospital_admin(_user_id UUID, _hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_admins
    WHERE user_id = _user_id AND hospital_id = _hospital_id
  )
$$;

CREATE POLICY "Admins view own hospital admin row" ON public.hospital_admins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---------- PROVIDER MEMBERSHIPS ----------
CREATE TABLE public.hospital_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ward_id UUID REFERENCES public.hospital_wards(id) ON DELETE SET NULL,
  status public.provider_status NOT NULL DEFAULT 'pending_verification',
  grant_method public.provider_grant_method,
  -- Geofence proof captured at onboarding
  onboarded_lat DOUBLE PRECISION,
  onboarded_lng DOUBLE PRECISION,
  onboarded_distance_m DOUBLE PRECISION,
  -- For passive_qr: temp access expires here unless promoted
  temp_expires_at TIMESTAMPTZ,
  staff_id_photo_path TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, user_id)
);
ALTER TABLE public.hospital_providers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_hospital_providers_updated
  BEFORE UPDATE ON public.hospital_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Provider verified-and-active check (RLS gatekeeper)
CREATE OR REPLACE FUNCTION public.is_verified_provider(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_providers
    WHERE user_id = _user_id
      AND status IN ('temporary', 'active')
      AND (temp_expires_at IS NULL OR temp_expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.provider_hospital_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT hospital_id FROM public.hospital_providers
  WHERE user_id = _user_id
    AND status IN ('temporary', 'active')
    AND (temp_expires_at IS NULL OR temp_expires_at > now())
  LIMIT 1
$$;

CREATE POLICY "Providers view own membership" ON public.hospital_providers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Hospital admins view their hospital providers" ON public.hospital_providers
  FOR SELECT TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Hospital admins update their hospital providers" ON public.hospital_providers
  FOR UPDATE TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (public.is_hospital_admin(auth.uid(), hospital_id));

-- Self-insert during onboarding (RLS validates user_id; geofence/QR validated by edge function)
CREATE POLICY "Provider self-insert pending row" ON public.hospital_providers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending_verification');

-- ---------- HOSPITAL QR TOKENS ----------
CREATE TABLE public.hospital_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  kind public.qr_kind NOT NULL,
  -- Rotating QR (admin device): expires after 5 minutes
  -- Static QR (poster): expires_at NULL = never
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_qr_tokens_hospital ON public.hospital_qr_tokens(hospital_id);
CREATE INDEX idx_qr_tokens_token ON public.hospital_qr_tokens(token);

CREATE POLICY "Admins view their hospital QR tokens" ON public.hospital_qr_tokens
  FOR SELECT TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Admins insert QR tokens" ON public.hospital_qr_tokens
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Admins delete QR tokens" ON public.hospital_qr_tokens
  FOR DELETE TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

-- ---------- ADMIN WHITELIST (instant bypass-verified) ----------
CREATE TABLE public.hospital_provider_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  contact TEXT NOT NULL, -- email or phone (normalized lowercase)
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, contact)
);
ALTER TABLE public.hospital_provider_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view whitelist" ON public.hospital_provider_whitelist
  FOR SELECT TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Admins manage whitelist insert" ON public.hospital_provider_whitelist
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hospital_admin(auth.uid(), hospital_id));

CREATE POLICY "Admins manage whitelist delete" ON public.hospital_provider_whitelist
  FOR DELETE TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id));

-- ---------- CONSULTATION HANDSHAKE (4-digit PIN) ----------
CREATE TABLE public.consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  pin TEXT NOT NULL, -- 4 digits, rotates per session
  pin_expires_at TIMESTAMPTZ NOT NULL, -- short window for claim
  provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- claimed-by
  claimed_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ NOT NULL, -- hard stop (2h after claim)
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_consult_patient ON public.consultation_sessions(patient_id);
CREATE INDEX idx_consult_provider ON public.consultation_sessions(provider_id);
CREATE INDEX idx_consult_pin_active ON public.consultation_sessions(hospital_id, pin)
  WHERE provider_id IS NULL AND revoked_at IS NULL;

CREATE TRIGGER trg_consult_updated
  BEFORE UPDATE ON public.consultation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- "Active" gatekeeper for clinical-data RLS
CREATE OR REPLACE FUNCTION public.has_active_consultation(_provider_id UUID, _patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultation_sessions
    WHERE provider_id = _provider_id
      AND patient_id  = _patient_id
      AND claimed_at IS NOT NULL
      AND revoked_at IS NULL
      AND ends_at > now()
  )
$$;

-- Patient owns their session row
CREATE POLICY "Patient view own sessions" ON public.consultation_sessions
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Patient insert own session" ON public.consultation_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patient update own session" ON public.consultation_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

-- Provider can see + claim sessions for their hospital
CREATE POLICY "Provider view hospital sessions" ON public.consultation_sessions
  FOR SELECT TO authenticated
  USING (
    public.is_verified_provider(auth.uid())
    AND public.provider_hospital_id(auth.uid()) = hospital_id
  );
CREATE POLICY "Provider claim hospital session" ON public.consultation_sessions
  FOR UPDATE TO authenticated
  USING (
    public.is_verified_provider(auth.uid())
    AND public.provider_hospital_id(auth.uid()) = hospital_id
  )
  WITH CHECK (
    public.is_verified_provider(auth.uid())
    AND public.provider_hospital_id(auth.uid()) = hospital_id
  );

-- ---------- EXTEND CLINICAL TABLES WITH PROVIDER-READ RLS ----------
-- Providers can read clinical data ONLY for patients with an active consultation

CREATE POLICY "Providers read consented vitals" ON public.vitals_logs
  FOR SELECT TO authenticated
  USING (public.has_active_consultation(auth.uid(), user_id));

CREATE POLICY "Providers read consented dose logs" ON public.dose_logs
  FOR SELECT TO authenticated
  USING (public.has_active_consultation(auth.uid(), user_id));

CREATE POLICY "Providers read consented score events" ON public.safety_score_events
  FOR SELECT TO authenticated
  USING (public.has_active_consultation(auth.uid(), user_id));

CREATE POLICY "Providers read consented score" ON public.health_safety_scores
  FOR SELECT TO authenticated
  USING (public.has_active_consultation(auth.uid(), user_id));

-- ---------- STORAGE: STAFF ID UPLOADS ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-ids', 'staff-ids', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Provider uploads own staff id"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'staff-ids'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Provider reads own staff id"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'staff-ids'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
