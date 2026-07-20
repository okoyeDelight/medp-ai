
-- Storage RLS on triage-pdfs bucket
-- Object naming convention: "<handoff_id>/<handoff_id>_patient.pdf" and "<handoff_id>/<handoff_id>_clinical.pdf"

CREATE POLICY "triage_pdfs read by handoff parties"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'triage-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.pharmacy_handoffs h
    WHERE h.id::text = split_part(name, '/', 1)
      AND (
        (name LIKE '%\_patient.pdf' ESCAPE '\' AND auth.uid() = h.patient_id)
        OR auth.uid() IN (h.doctor_id, h.pharmacist_user_id)
      )
  )
);

CREATE POLICY "triage_pdfs insert by clinicians"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'triage-pdfs'
  AND EXISTS (
    SELECT 1 FROM public.pharmacy_handoffs h
    WHERE h.id::text = split_part(name, '/', 1)
      AND auth.uid() IN (h.doctor_id, h.pharmacist_user_id)
  )
);
