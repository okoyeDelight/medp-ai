## Summary

Describe the change and the problem it solves.

## Change type

- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Security/privacy
- [ ] Database migration
- [ ] Clinical-safety-related change

## Validation

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Tests added or updated where practical
- [ ] Any unrun checks are explained below

## Nigeria care-continuity and product decision gate

- [ ] Identifies one precise **Nigerian first-contact, triage, referral, medication-reality or handoff break**, with official/local evidence and evidence limitations
- [ ] States the licensed operator, beneficiary, care moment, payer hypothesis and how this beats ordinary paper/phone/EHR workflow
- [ ] Records what already exists through NDHI/NDHA, NEMSAS, NAFDAC, WHO, state health systems, competitors; no fake endorsement or nonexistent API
- [ ] Defines a measurable success, independent baseline, clinician workload and explicit kill/pivot condition
- [ ] Handles power/data outage, shared phones, lack of patient ID, low literacy, no receiver acknowledgment, no ambulance/bed and fallback to existing clinical processes
- [ ] Distinguishes **transmitted ≠ received ≠ accepted ≠ arrived ≠ completed** and preserves reported vs verified medicine claims, sources and unknowns
- [ ] Uses interoperable, patient-rights-respecting design; no exclusive health-data monopoly or unverified medical content

## Safety and privacy review

- [ ] No secrets, credentials, or real patient data are included
- [ ] Authorization and data-access implications were considered
- [ ] New environment variables are documented in `.env.example`
- [ ] Health-related claims include appropriate evidence and limitations
- [ ] Clinical review is identified as required where the change may affect care, including facility-based triage by appropriately trained professionals and intended-use/NAFDAC SaMD review
- [ ] Database migrations and rollback considerations are documented where relevant

- [ ] No fabricated patients, products, emergency/clinical outcomes or fake healthcare data in actual UI; internal test fixtures remain isolated
- [ ] No real patient information in unverified Supabase/Vercel/GitHub. Source licensing, consent, RLS/role checks, DPIA and cross-tenant security tests precede any live patient use
- [ ] Master handoff updated with **facts vs hypotheses, exact code, tests, limits and reason for each decision**, and PR remains draft until gates are met

## Additional notes

Describe deployment steps, migration requirements, screenshots, limitations, and follow-up work.
