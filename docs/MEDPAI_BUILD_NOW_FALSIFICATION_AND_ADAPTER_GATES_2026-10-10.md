# MedPAi — Build Now, Validate With Facilities Later
**Decision register and engineering gates · 10 October 2026**

**Founder directive:** Continue building. Future conversations with licensed clinics/pharmacies/hospitals must be able to correct our assumptions without replacing the whole product. Every idea is tested against clinical safety, Nigerian infrastructure, existing public systems and a simpler baseline. No fictional records in actual product UI. This note is **not** field evidence or clinical approval.

## One defensible hypothesis, not a national feature backlog

**Hypothesis:** A source-preserving, professional-led care-transition layer can reduce information loss and false referral closure between healthcare workers/facilities. Medication-use reconciliation and what was learned at first contact are parts of that care transition. A facility may use a different form, language, phone, paper or EHR; the system must preserve common truths and explicit unknowns without centralizing all of healthcare.

**Initial candidate:** One **non-emergency** outpatient referral paired with medication information; operator, payer, state, workflow burden and willingness-to-pay remain unknown. No emergency dispatch, automated urgency calculation or patient self-diagnosis.

**Reason for standards-first design:** The Nigeria Digital in Health Initiative's NDHA seeks interoperable services rather than fragmented EHR duplication; the Federal Ministry's September 2026 NHTDAO steering committee stresses coordination and minimum standards. WHO/AHOP's 2025 Nigerian Health Systems profile (updated October 2026) highlights weak information use and referral processes. These are policy and system assessments, **not** verified MedPAi demand, live national API endpoints or an endorsement.
- https://health.gov.ng/fg-moves-to-accelerate-digital-health-transformation-with-national-health-technology-and-data-analytics-office/
- https://www.digitalhealth.gov.ng/relevant-documents
- https://ahop.afro.who.int/download/health-information-and-information-systems-nigeria-health-systems-and-services-profile/
- https://ahop.afro.who.int/download/service-delivery-nigeria-health-systems-and-services-profile/
- https://www.digitalhealth.gov.ng/ndhi-rfi

## Keep / reject / defer after adversarial review

| Idea | Decision now | Attempt to break it | Resulting invariant |
| --- | --- | --- | --- |
| One source-aware handoff packet | **KEEP foundation** | A field may be absent, withheld, unknown, outdated, or contradictory | Preserve state/source/time; no invented fact; packet always needs professional review |
| Profile-based clinic customization | **KEEP in bounded form** | A partner could remove patient linkage or make automated triage mandatory | Versioned profile may **add** required fields; permanent minimum, fixed non-emergency scope |
| Recorded medication identity reviews | **HARDEN** | Anyone can forge a reviewerRef string in JSON | Inject trusted backend verification callback; if unavailable, no corroboration or product identity promotion |
| Digital referral status timeline | **KEEP core** | A database insert or gateway 202 might be reported as a completed referral | Transport receipt, receiving-team ACK, acceptance, arrival and care completion are independent |
| Offline medical records cache | **DEFER** | Shared/lost phones and insecure storage expose health information | No PHI persistence or background sync until encryption, unlock/role controls and retention/erase controls verified |
| Auto-switch to a different receiving hospital | **REJECT for now** | No verified bed/clinician capacity, patient consent, payment or geographic transport | No inferred capacity, no silent rerouting |
| AI triage/diagnostic urgency score | **REJECT for current release** | Model may delay emergency care or create unlicensed clinical decisions | Only trained authorized clinicians make clinical disposition; existing emergency/downtime pathway bypasses app |
| Patient-facing herb–drug red/green safety check | **REJECT current release** | Unidentified mixtures and poorly validated interaction data create false reassurance | Raw traditional product disclosures remain unknown pending qualified evaluation |
| One nationwide medication or patient registry | **REJECT** | Duplicates NDHI/NAFDAC efforts, creates data sovereignty risk | Integrate via permitted standards; do not claim public APIs are live |
| AI to parse short handoff notes | **DEFER until baseline superiority** | May invent facts or require more verification time than a form | Any future AI must cite exact source spans, permit abstention and never suppress human unresolved questions |
| Partner-specific language/forms | **KEEP as future configuration** | A local label or translation may imply a different medical meaning | Original source preserved; professional translation and version-specific validation before use |
| Public/government launch | **DEFER** | No production-secure backend, independent clinical assessment, payer or regulator review | PR remains draft, protected preview sample-free/PHI-free, no clinical service claims |

## Code boundaries delivered now

1. `src/lib/handoffEvidence.ts`: Versioned **non-emergency** local workflow profile; five mandatory source/meta descriptors can never be removed; additional allowed source fields can be required per site in a *new revision*. Missing, unknown, withheld, unattributed and unverified time are distinct. Output is **metadata coverage for human review, never authority to treat or send**. No patient facts are stored in this code.
2. `src/lib/medicationEvidence.ts`: Medication review now requires a **caller-provided trusted verification function**. No callback means no reviewer IDs can establish corroboration or human-linked identity. Duplicate source and assertion IDs fail, as do identity links crossing unrelated subject references.
3. `src/lib/referralTransitions.ts`: Existing event timeline with mandatory trusted role verifier; no transmitter auto-accepts its own referral; care acceptance/arrival/completion are distinct.
4. `src/lib/referralTransportEvidence.ts`: Separate **HTTP/network transport** from the care workflow. Retries carry stable destination/idempotency references; a gateway success never confirms recipient receipt or treatment, and a timeout stays unknown. Source-only/typed, **no network calls or offline queue**.
5. Isolated Vitest tests attack these boundaries; tests use only opaque fake IDs, not actual patient records or UI data.
6. No clinical functionality has been enabled, no stored personally identifiable health information, no provider API connection, no model inference.

**Important trust boundary:** The pure modules only assess structurally supplied metadata. Even a valid-looking `provenanceRef`, review callback or transport receipt is **not authenticated proof** until the correctly identified backend enforces authority, facilities, patient permission, immutable events, secure timestamps and organization boundaries. Do not present the outputs to patients as clinical clearance. The in-repo browser workspace currently has **no verified production storage**.

## Partner integration seams—future without a rewrite

When a real licensed partner is available, onboarding should produce a **new, documented profile revision**, not overwrite earlier clinical records.

- **Mapping, not replacement:** Map authorized facility source fields to canonical metadata fields and preserve original document, time, version and unknowns. A clinic's EHR/PDF/paper channel becomes an adapter, not a new domain concept.
- **Authorized people:** Use independently verified staff/facility identity and per-patient lawful purpose/consent controls at the server. Do not trust `actorRole`, `reviewerRef`, `profileId` or clinic names typed by the browser.
- **Connectivity:** Implement secure, idempotent transport only after privacy/security design; show "transmission attempted" separately from an actual signed receiving-team acknowledgment. If no safe digital path, use facility-approved paper/phone process, not an unencrypted browser offline cache or public QR.
- **Local workflow:** Site interviews may change optional required metadata and ordering; they may **not** change core event meaning, create automatic triage, bypass professional review, infer medication use, or override urgent-care procedures.
- **Interoperability:** Map later to the then-current **Nigeria Core/FHIR implementation guides** if verified and permitted; no assumed government endpoint, patient-number scheme or national availability.
- **Feedback:** Store only non-identifying research observations until consent/security/ethics permits more. Separate observed facts from vendor/site preferences; document who approved the profile, date, tests and rollback. Do not automatically retrain or modify clinical logic based on interview comments.
- **Historical integrity:** An episode references exact profile ID and revision; don't retroactively reinterpret old events when a new clinic configuration launches.
- **Commercial adaptation:** A single operator, verified receiving team's participation, budget owner and a measurable failure matter more than a platform-wide sign-up flow.

## Ten tests an eventual clinic must be able to pass

1. Paper/phone baseline vs MedPAi has a genuine independently observed information-loss or follow-up problem.
2. No fake receiver acknowledgment when gateway says HTTP 200/202 or network times out.
3. A hospital cannot access another institution's unconsented patient packet or forge another's ACK.
4. No ambiguous patient match or reliance on a national ID unavailable to the person.
5. Missing/historical/herbal/OTC information stays unknown or source-reported, never clinical truth.
6. One facility is offline for 48 hours; clinical fallback works and no plaintext PHI is left on shared devices.
7. No untrained operator is asked to decide clinical urgency; emergency procedures are not gated by software.
8. Receiver declines/no capacity or patient never arrives; outcome remains explicitly open for responsible follow-up.
9. A new field/language/profile revision cannot silently change a prior patient's event or bypass mandatory evidence requirements.
10. The actual licensed staff's time and total cost do not exceed the value demonstrated against a simpler secure form/call process.

**Kill criteria:** If ordinary supported forms/phone calls do as well, staff burden rises without clinical information gain, no responsible payer exists, safe authorization/retention is infeasible, a third party can falsify an ACK, or incorrect clinical authority results, stop/pivot the feature. Do not rely on assumed future government investment.

## Engineering sequence while partner access is pending

**Next engineering gates (not yet complete):** (1) Reproducible package lockfile/CI installation; (2) clearly identify the actual Supabase project and independently verify RLS/RPC/edge functions; (3) design the authenticated event/episode storage and cross-tenant negative tests *without uploading real patient data*; (4) implement minimal approved referral channel adapter and server ACK authority; (5) independently review triage, medication/interaction claims and regulator obligations; (6) compare one referral with paper/phone baseline once an authorized partner exists.

Do not merge safety PR or market this as validated healthcare until security, privacy, clinical governance and intended-use rules are addressed. Existing RxNorm data are only terminology references, not Nigerian-registration or medicine-safety proof.
