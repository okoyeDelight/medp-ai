-- Tighten dose_logs RLS: drop existing policies and re-create them strictly
-- restricted to the authenticated role with explicit non-null user check.
DROP POLICY IF EXISTS "Users delete their own dose logs" ON public.dose_logs;
DROP POLICY IF EXISTS "Users update their own dose logs" ON public.dose_logs;
DROP POLICY IF EXISTS "Users view their own dose logs" ON public.dose_logs;
DROP POLICY IF EXISTS "Users insert their own dose logs" ON public.dose_logs;

CREATE POLICY "Authenticated users view own dose logs"
ON public.dose_logs
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users insert own dose logs"
ON public.dose_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users update own dose logs"
ON public.dose_logs
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users delete own dose logs"
ON public.dose_logs
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);