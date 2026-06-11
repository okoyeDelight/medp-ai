
-- ============================================================
-- 1. Severity enum + drug_herb_interactions
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.interaction_severity AS ENUM ('severe','moderate','mild');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.interaction_verification AS ENUM ('pending','verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.drug_herb_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  drug_name_lc TEXT GENERATED ALWAYS AS (lower(drug_name)) STORED,
  herb_id TEXT NOT NULL,
  herb_name TEXT NOT NULL,
  severity public.interaction_severity NOT NULL,
  mechanism TEXT NOT NULL,
  clinical_advice TEXT NOT NULL,
  affected_systems TEXT[] NOT NULL DEFAULT '{}',
  source_api TEXT NOT NULL DEFAULT 'MedP-AI Clinical Database v1.2',
  citation TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status public.interaction_verification NOT NULL DEFAULT 'verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dhi_drug_lc ON public.drug_herb_interactions (drug_name_lc);
CREATE INDEX IF NOT EXISTS idx_dhi_herb ON public.drug_herb_interactions (herb_id);

GRANT SELECT ON public.drug_herb_interactions TO authenticated;
GRANT ALL ON public.drug_herb_interactions TO service_role;

ALTER TABLE public.drug_herb_interactions ENABLE ROW LEVEL SECURITY;

-- Verified providers can read the clinical cache
CREATE POLICY "Providers read interactions"
  ON public.drug_herb_interactions FOR SELECT
  TO authenticated
  USING (public.is_verified_provider(auth.uid()));

-- Platform admins manage entries
CREATE POLICY "Platform admins manage interactions"
  ON public.drug_herb_interactions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

CREATE TRIGGER trg_dhi_updated_at
  BEFORE UPDATE ON public.drug_herb_interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Care-team roster (strict provider ↔ patient link)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.care_team_status AS ENUM ('active','scheduled','historical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.patient_care_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  status public.care_team_status NOT NULL DEFAULT 'active',
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_pct_provider ON public.patient_care_team (provider_id, status);
CREATE INDEX IF NOT EXISTS idx_pct_patient ON public.patient_care_team (patient_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_care_team TO authenticated;
GRANT ALL ON public.patient_care_team TO service_role;

ALTER TABLE public.patient_care_team ENABLE ROW LEVEL SECURITY;

-- Provider sees only their own roster
CREATE POLICY "Provider reads own care team"
  ON public.patient_care_team FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- Patient can see who is on their team
CREATE POLICY "Patient reads own care team"
  ON public.patient_care_team FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Hospital admins manage the roster at their hospital
CREATE POLICY "Hospital admins manage care team"
  ON public.patient_care_team FOR ALL
  TO authenticated
  USING (public.is_hospital_admin(auth.uid(), hospital_id))
  WITH CHECK (public.is_hospital_admin(auth.uid(), hospital_id));

CREATE TRIGGER trg_pct_updated_at
  BEFORE UPDATE ON public.patient_care_team
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Care-team lookup function
CREATE OR REPLACE FUNCTION public.is_on_care_team(_provider_id UUID, _patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_care_team
    WHERE provider_id = _provider_id
      AND patient_id = _patient_id
      AND status IN ('active','scheduled')
  )
$$;

-- ============================================================
-- 3. Founder Verified Doctor seed (email-verified only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_founder_provider()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  demo_hospital_id UUID;
BEGIN
  -- Only run for the founder email AND only after email confirmation
  IF lower(NEW.email) <> 'chinedubisiola04@gmail.com' THEN
    RETURN NEW;
  END IF;
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  -- Don't re-seed
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'provider') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO demo_hospital_id FROM public.hospitals
   WHERE slug = 'medp-ai-demo-clinic' LIMIT 1;
  IF demo_hospital_id IS NULL THEN
    SELECT id INTO demo_hospital_id FROM public.hospitals
     ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF demo_hospital_id IS NULL THEN
    RETURN NEW; -- no hospital yet
  END IF;

  INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'provider')
    ON CONFLICT DO NOTHING;

  INSERT INTO public.hospital_providers
    (hospital_id, user_id, status, grant_method, approved_at)
  VALUES
    (demo_hospital_id, NEW.id, 'active', 'qr_geofence', now())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_founder_provider_insert ON auth.users;
DROP TRIGGER IF EXISTS trg_seed_founder_provider_update ON auth.users;

CREATE TRIGGER trg_seed_founder_provider_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_founder_provider();

CREATE TRIGGER trg_seed_founder_provider_update
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.seed_founder_provider();

-- ============================================================
-- 4. Seed curated drug-herb interactions for the clinical engine MVP
-- ============================================================
INSERT INTO public.drug_herb_interactions
  (drug_name, herb_id, herb_name, severity, mechanism, clinical_advice, affected_systems, source_api, citation, verification_status)
VALUES
  ('Digoxin','hibiscus','Hibiscus / Zobo','severe',
   'Hibiscus extract competes for CYP3A4 metabolism and inhibits P-glycoprotein efflux, increasing digoxin serum levels and risk of cardiac glycoside toxicity (arrhythmia, visual disturbance, AV block).',
   'Discontinue hibiscus infusions immediately. Re-baseline serum digoxin within 24h. Consider 25–50% dose reduction until levels normalize.',
   ARRAY['Cardiac','Hepatic'],
   'PubMed', 'PMID 19389078 / WHO Monograph Vol.2', 'verified'),
  ('Digoxin','agbo','Agbo (mixed herbal infusion)','severe',
   'Variable alkaloid load alters cardiac glycoside binding at Na+/K+-ATPase and may potentiate bradyarrhythmia. Unknown botanical purity adds toxicity risk.',
   'Stop Agbo. Continuous ECG monitoring for 12h. Treat digoxin toxicity per local protocol (Digibind if SBP<90 or AV block ≥2°).',
   ARRAY['Cardiac'],
   'WHO','WHO Traditional Medicine Strategy 2014-2023','verified'),
  ('Warfarin','ginger','Ginger','severe',
   'Additive antiplatelet effect via thromboxane A2 inhibition; potentiates INR and bleeding risk.',
   'Hold ginger. Re-check INR within 48h. Counsel on bleeding signs.',
   ARRAY['Hematologic'],
   'PubMed','PMID 16317757','verified'),
  ('Warfarin','garlic','Garlic','severe',
   'Inhibits platelet aggregation and CYP2C9, raising warfarin AUC and INR.',
   'Discontinue garlic supplements. Repeat INR within 72h.',
   ARRAY['Hematologic'],
   'PubMed','PMID 12734814','verified'),
  ('Warfarin','scentleaf','Scent Leaf (Ocimum gratissimum)','moderate',
   'Variable vitamin-K content may antagonize warfarin and lower INR unpredictably.',
   'Standardize intake or stop. Recheck INR weekly until stable.',
   ARRAY['Hematologic'],
   'MedP-AI Clinical Database v1.2','PCN Reference Protocol §4.2','verified'),
  ('Acetaminophen','hibiscus','Hibiscus / Zobo','moderate',
   'Altered glucuronidation kinetics; may delay paracetamol absorption and peak plasma concentration.',
   'Separate doses by ≥2h. No dose change required if hepatic panel normal.',
   ARRAY['Hepatic'],
   'PubMed','PMID 19748438','verified'),
  ('Metformin','bitterleaf','Bitter Leaf (Vernonia amygdalina)','moderate',
   'Independent hypoglycemic effect via AMPK activation. Additive risk of hypoglycemia, especially in fasting state.',
   'Reduce metformin dose by 25% or hold bitter leaf. Monitor capillary glucose 4-hourly.',
   ARRAY['Endocrine'],
   'PubMed','PMID 24299811','verified'),
  ('Insulin','bitterleaf','Bitter Leaf','severe',
   'Synergistic hypoglycemia. Risk of neuroglycopenic event within 2h post-dose.',
   'Hold bitter leaf 24h. Reassess basal insulin. Provide glucose tablets bedside.',
   ARRAY['Endocrine'],
   'WHO','WHO Diabetes Module 2021','verified'),
  ('Amlodipine','hibiscus','Hibiscus / Zobo','moderate',
   'Additive vasodilatory effect; may precipitate symptomatic hypotension and reflex tachycardia.',
   'Monitor BP supine + standing for 48h. Consider 2.5mg dose reduction if SBP<110.',
   ARRAY['Cardiovascular'],
   'PubMed','PMID 19140159','verified'),
  ('Lisinopril','hibiscus','Hibiscus / Zobo','moderate',
   'Both lower BP via different pathways; additive hypotension.',
   'BP check daily x3. Hold zobo if SBP<100.',
   ARRAY['Cardiovascular'],
   'MedP-AI Clinical Database v1.2','Internal review','verified'),
  ('Ibuprofen','ginger','Ginger','moderate',
   'Combined antiplatelet effect plus GI mucosal irritation increases bleed risk.',
   'Add PPI cover if continuing both. Stop ginger if GI symptoms appear.',
   ARRAY['GI','Hematologic'],
   'PubMed','PMID 17157290','verified'),
  ('Ciprofloxacin','dogonyaro','Dogonyaro (Neem)','moderate',
   'Neem may induce hepatic enzymes, lowering ciprofloxacin AUC and risking treatment failure.',
   'Separate doses by 4h. Reassess clinical response at 48h.',
   ARRAY['Hepatic','Infectious'],
   'MedP-AI Clinical Database v1.2','Pharm. Review NG 2023','verified')
ON CONFLICT DO NOTHING;
