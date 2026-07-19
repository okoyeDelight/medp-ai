-- Tighten public RLS: replace USING (true) with authenticated-only access.
DROP POLICY IF EXISTS "Anyone view wards" ON public.hospital_wards;
DROP POLICY IF EXISTS "Anyone can view hospitals" ON public.hospitals;

CREATE POLICY "Authenticated view wards"
  ON public.hospital_wards FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated view hospitals"
  ON public.hospitals FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Ensure anon has no read access to these anymore.
REVOKE SELECT ON public.hospital_wards FROM anon;
REVOKE SELECT ON public.hospitals FROM anon;