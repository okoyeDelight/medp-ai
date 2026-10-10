# MedPAi Phase 1 — Evidence-first Medication Reconciliation

**Working hypothesis (not final market decision):** Licensed clinician or pharmacist reviewing an **adult outpatient hypertension follow-up**. Chronic diabetes follow-up is a possible adjacent setting, but do **not** launch both at once.

**As of 2026-10-10:** Research-and-engineering stage. No patient-data clearance, site partnership, clinical evidence of benefit, regulated medical device approval, or validated commercial demand.

## 1. Exact moment of use

Before a follow-up prescription or medication review, a licensed professional needs to compare:
1. What is prescribed (may be historical).
2. What a person/caregiver **reports** actually taking or not taking.
3. What the pharmacy may have dispensed, if legitimately available.
4. OTC, traditional, herbal and unidentified products the person reports.
5. Time and changes in the reported use.

A doctor’s prescription is a claim about an order. A pharmacy's dispensing entry is a claim about supply. Neither proves consumption. Even an RxNorm match is a **terminology candidate**, not product equivalence or verified use.

**Opportunity to validate:** Does source-aware capture and a discrepancy/unknowns review queue measurably improve documentation and reduce appropriate professional verification burden compared with a short normal medication-history form?

## 2. What is actually implemented on the safety branch

- **Source catalog:** data/REFERENCE_SOURCES.json classifies NLM Prescribable RxNorm as permitted for controlled terminology import, while Nigeria EML PDF bulk use and NAFDAC Greenbook automated access remain blocked pending source rights.
- **Pure domain model:** src/lib/medicationEvidence.ts represents evidence sources, medication assertions, human-linked medicine identities, separate corroboration events and a deterministic queue. A source can assert prescribed, dispensed, reports-taking, reports-stopped, reports-not-taking, or unknown. Prescribed ≠ taken; unknown stays unknown; raw medicine spellings remain visible; no source is silently privileged.
- **No name-only matching:** Two identical labels cannot become the same human-reviewed product; a link requires a separate reviewer event that future secure backend must authenticate.
- **Conservative exception queue:** unknown, missing source, uncorroborated assertion; a cross-source difference is raised only for explicitly human-linked same-person current-use reports. These are operational prompts, not a clinical risk score, drug–drug interaction assessment or patient instruction.
- **Controlled NLM terminology importer:** scripts/import-rxnorm-ingredients.mjs downloads **IN ingredient concepts** from the NLM *Prescribable RxNorm* endpoint, validates documented JSON shape, validates count/identifiers, deduplicates, records source/retrieval date/content hash/jurisdiction/NLM acknowledgment, and writes an atomic JSON review artifact. No patient data are submitted.
- **Review-only GitHub Actions:** .github/workflows/rxnorm-reference-audit.yml imports terms only on a manual workflow dispatch (after the workflow is available on the default branch); the initial PR audit was executed successfully before changing to manual-only to avoid unnecessary repeat requests. The temporary artifact is for manual inspection. **It does not deploy terminology to Vercel, commit snapshots, approve Nigeria brands, or provide an interaction database.**
- **Automated tests:** src/lib/medicationEvidence.test.ts and scripts/import-rxnorm-ingredients.test.mjs protect against information promotion, inferred adherence and unproven mapping, malformed provider data, and missing source attribution.
- **Existing preview:** src/preview/MedPAiPreview.tsx still provides zero prefilled patient or medicine entries and browser-memory-only capture. It is NOT wired to this model or a secure backend. No real identifiable patient data should be entered.

## 3. Official data sources and access decisions

| Source | Right now | Purpose | Constraint |
|---|---|---|---|
| NLM Prescribable RxNorm (IN) | Controlled API import and inspect only | Real ingredient reference naming and source codes | Public non-proprietary vocabulary; terms and limits apply; US-centric and not a Nigerian local-brand registry |
| Nigeria Essential Medicines List 2024, Adults, 8th Ed. | Manual official reference | Define Nigerian priority clinical vocabulary and policy relevance | Reuse terms for official PDF still to be established; don't copy/redistribute blindly |
| NAFDAC Greenbook / NAPAMS | Manual lookup/link only | Product regulatory reference | Website visibility does not authorize bulk/commercial API; registration ≠ individual pack authenticity or safety |
| WHO / research aggregates | Research and market context | Define healthcare burden and evidence gaps | Population numbers are not medicine histories; no patient-level clinical inference |
| FAERS/openFDA | NOT in clinical decision flow | Possible later research | Signal reports cannot establish causation or safety, nor Nigerian incidence |

NLM official non-proprietary data licensing: https://lhncbc.nlm.nih.gov/RxNav/APIs/PrescribableAPIs.html and terms https://www.nlm.nih.gov/research/umls/rxnorm/docs/termsofservice.html. Official release: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html. Nigeria list: https://www.health.gov.ng/wp-content/uploads/2025/08/Final-NEML-Adult-8th-Edition.pdf.

**NLM acknowledgment for future product use:** The source artifact includes NLM's exact requested acknowledgment and nonendorsement text. Future UI must show the appropriate attribution before use. Never describe RxNorm ingredient matching as guaranteed correct for Nigerian brands, mixtures or local names.

## 4. Privacy and clinical boundaries

- No clinical recommendations, automatic medicine doses, interaction clearance, medicine starts/stops, risk colors or efficacy claims.
- No personally identifiable or sensitive patient information in GitHub, GitHub Actions artifacts, Vercel previews, error reporting, public dataset APIs, or local tests.
- Human review **metadata are not authorization**. A backend must verify the human reviewer's license/role, identity and patient permission independently, then append immutable review events under strict RLS.
- Preserve report source and time; don't treat reporting, prescribing, dispensing and use as interchangeable; do not collapse undocumented herbal mixtures to a specific ingredient.
- An actual patient workflow requires privacy, consent, retention/deletion, access-logging, breach handling, RLS negative tests and appropriate regulatory/clinical evaluation. Prior security audit identified mismatched Supabase project refs and live RLS unverified.
- A reference dataset cannot prove medicine safety, individual exposure, diagnosis or clinical equivalence.

## 5. Next narrow implementation gates

**Gate A — Data integrity (in progress):**
- Review actual NLM import artifact from CI; verify provenance and expected concept coverage.
- Add typed terminology crosswalks with explicit *candidate* and human-confirmed states, no silent auto-confirmation.
- Resolve Nigeria EML document permissions and identify which high-priority ingredient names need country-local crosswalks.
- No NAFDAC scraping or unlicensed commercial bulk redistribution.

**Gate B — Authentic one-encounter flow:**
- Model an assertion episode's time evolution, source changes, contradiction review and human decision event.
- One outpatient adult hypertension encounter. No broad EHR or multi-specialty expansion.
- Show exact source and uncertainty rather than green/red drug safety.
- Compare to ordinary structured form; keep app empty before user input.

**Gate C — Secure access and evidence:**
- Resolve active intended Supabase project and deployed auth/RLS/privileged RPC concerns.
- Build authenticated, append-only medication assertion and review storage with granular access, audit and deletion rights.
- Clinical stakeholder usability tests, business owner/payer interview; obtain ethics/site approvals before any identifiable real-world study.

**Gate D — Go/no-go commercial test:**
- At least two licensed organisations willing to design/test under proper controls.
- One actual buyer with clear purchase authority and a priced willingness-to-pay experiment.
- Measurable gains versus normal history form without unsafe false declarations, unacceptable extra time or privilege mistakes.
- If the simpler form performs as well, or source/data rights are unusable, simplify or stop.

## 6. What this phase does NOT mean

- No national drug registry built.
- No licensed or NAFDAC-approved drug intelligence engine.
- No complete Nigeria drug inventory, no live prescription feeds.
- No real clinician/patient collaboration in current preview.
- No WHO, UN, NAFDAC or World Bank partnership.
- No production readiness, and no automatic failover validated.
- No direct dataset scraping beyond documented permitted NLM non-proprietary endpoint.

Next decision after verification: whether the proposed outpatient hypertension setting has an operator, purchaser and information gap that is not already satisfied by existing records/forms.
