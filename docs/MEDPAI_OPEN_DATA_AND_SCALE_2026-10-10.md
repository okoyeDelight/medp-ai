# MedPAi — Open Data, Product Scale, and World Bank Funding Reality

**Research date:** 2026-10-10. **Status:** Founder research note; not an implemented data ingestion, verified data license, clinical decision engine, or adopted commercial plan. Do not expose patient data or install silent scrapers.

## Decision framing

MedPAi does not need to produce original national medicine vocabularies or begin with an ML training pipeline. Available source datasets can support a provenance-rich **medicine identification and documentation** product. They do **not** establish any individual's medicine use, clinical equivalence, appropriate doses, herbal efficacy or interaction safety. Source-specific licenses matter even when web pages are public.

World Bank funding scale does not equal cost of building this product: a September 2024 World Bank financing package approved **$1.57 billion for three national programmes**, not a software application:
- **HOPE-GOV $500m**: financial/human-resource governance in health and education.
- **HOPE-PHC $570m**: $500m IDA concessional credit plus $70m GFF grants; PHC service delivery and maternal/newborn/child/adolescent health and nutrition, targeted benefit around 40 million.
- **SPIN $500m**: irrigation, dams and water infrastructure, NOT health technology.
Source: https://www.worldbank.org/en/news/press-release/2024/09/26/world-bank-approves-new-financing-for-nigeria-to-improve-health-outcomes-safety-of-dams-and-irrigation-services

Implication: government system-change is expensive due to infrastructure, service delivery, staff, states, procurement, financing management, program measurement and rollout. MedPAi should avoid copying that scale. A small private software wedge must still budget for clinical governance, product liability, privacy/security, distribution and professional workflow change.

## Candidate data-source inventory (no source ingested yet)

| Source | Suitable use | License/access/reliability status |
| --- | --- | --- |
| Nigeria 2024 Essential Medicines List, published on WHO site 9 September 2026 | Narrow Nigeria-first starting vocabulary and reference to national priority medicines | Official PDF exists; verify document-level reuse terms before storing/redistributing parsed bulk text. Does not contain every market brand. https://www.who.int/publications/m/item/nigeria--essential-medicines-list-2024-%28english%29 |
| NAFDAC Greenbook | Search current registered-product name, stated ingredient/form, registration status and other available descriptors | Official **public search**; **commercial redistribution, comprehensive extraction or official API license unverified**; do not assume a public website = free bulk rights. Prefer click-through/authorized lookup until written access/terms are confirmed. Product registration is not proof of patient safety, clinical interaction or physical pack authenticity. https://greenbook.nafdac.gov.ng/ |
| NAFDAC NAPAMS | Manual certificate/registration number confirmation | Public verification workflow, not an approved bulk API/data license. https://registration.nafdac.gov.ng/Home/ |
| NLM RxNorm / RxNav API | Non-authoritative candidate generic name and ingredient normalization, drug vocabulary crosswalk | Core RxNorm vocabulary public domain and prescribable subset requires no full data license; proprietary sources in full release need UMLS license/additional terms; US-centric and may miss Nigerian brands. Attribution/nonendorsement/update requirements. Crucially RxNav drug–drug interaction features ended Jan 2, 2024—**not** a source for a functioning interaction engine. https://www.nlm.nih.gov/research/umls/rxnorm/overview.html ; https://www.nlm.nih.gov/research/umls/rxnorm/docs/termsofservice.html ; https://lhncbc.nlm.nih.gov/RxNav/information/FAQs.html |
| NIH DailyMed labels | Evidence/source links for US-registered label facts and exploration, e.g., formulations | US regulatory context; not a substitute for an approved Nigerian label, professional evaluation or verified herb interactions. API https://dailymed.nlm.nih.gov/dailymed/webservices-help/v2/spls_api.cfm ; assess source-specific rights. |
| openFDA drug/NDC reference | U.S. product naming context, research | openFDA generally CC0 unless exceptions, but FDA NDC listing does NOT imply FDA approval. https://open.fda.gov/apis/drug/ndc/ ; https://open.fda.gov/license/ |
| openFDA FAERS | Aggregate pharmacovigilance research and development of an evidence-aware research parser | Spontaneous suspected reports do **not** imply causality, patient-level interaction safety, frequency/incidence or Nigerian prevalence; duplicates and under-reporting. Never drive red/green patient interaction clearance from reports. https://open.fda.gov/apis/drug/event/ |
| WHO 2025 Model Essential Medicines List (eEML) | Baseline priority medication terminology/global comparison | eEML site states CC BY 3.0 IGO with commercial adaptation conditions and restrictions on product promotion. Individual publication PDFs may carry *different* CC BY-NC-SA 3.0 IGO licenses; verify license of exact asset before use. Essential list membership is not advice/approval for patient. https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists/ ; https://list.essentialmeds.org/licencing |
| WHO GHO via OData and data.who.int | Population health indicators, epidemiology/context and market-entry research | Aggregated public data, no actual person-level medicine use. data.who.int terms normally CC BY 4.0 subject to attribution, exceptions and nonendorsement. Some legacy who.int datasets have materially different terms. Confirm dataset-specific terms. https://www.who.int/data/gho/info/gho-odata-api ; https://data.who.int/about/data/terms-and-conditions |
| PhysioNet MIMIC-IV | Restricted academic workflow/method research | Credentialed, signed DUA and training; US inpatient data, not public unrestricted training data, and not representative of Nigerian community or herbal use. Do not mirror into public GitHub or commercial app. https://physionet.org/content/mimiciv/ |
| Synthea | Internal engineering/automated integration tests only | Generates **fictional** records; founder has explicitly rejected fictional medicine/patient records in actual UI. Synthetic fixtures can be isolated in tests and never shown as clinical data or clinical efficacy proof. https://github.com/synthetichealth/synthea |
| Nigeria Core FHIR profiles, NDHI architecture | Future interoperability schemas and design constraints | Public architecture/draft FHIR resources do not prove a live national registry/API, credential eligibility or permission to integrate. https://www.digitalhealth.gov.ng/ ; https://github.com/digitalhealth-gov-ng/Nigeria-Core |

## Data products are different from patient truths

Require separate layers:
1. **Reference sources**: versioned terminology, source URL/version/license, jurisdiction, approved/reported product attributes, optional mappings with score/unknown, update cadence and expiry.
2. **Real reported assertions**: verbatim user/clinician statements, time, origin, whether prescribed/dispensed/reported-used, source evidence and metadata, no silent inference.
3. **Review and transitions**: discrepancy candidates, reviewed/unreviewed/conflicting statuses, verified-by, events and signed handoff, with revocation/audit trail.
4. **Population research**: WHO indicators, clinical studies; useful for selecting problems, NOT drug dosing decisions for individual patients.

No source, including WHO EML, RxNorm, NAFDAC registration or FAERS, by itself constitutes safety clearance or evidence someone is taking that medicine. Preserve unrecognized traditional preparations as raw reports with unknown ingredient status; NEVER silently map local/herbal names to substances.

## Proposed milestone sequence / cost gates

**Gate 0 — Product economics:** Confirm one professional operator, one setting, one paying customer, and exact encounter; inspect competing workflows before any major code expansion.
**Gate 1 — Data rights and provenance:** Registry of dataset owner, URL, release, access route, license terms, geographic validity, freshness, transformations, unknown/error handling, expiry, auditing; ingestion limited to clearly permitted sources. Prefer Nigeria Essential Medicines List review + no-license RxNorm subset + NAFDAC **manual links**, not unapproved scraping.
**Gate 2 — Basic product:** User-entered medicine reconciliation from real reported sources; explicit unverified flags; stable schema. Frontend already has session-only input but no authenticated persistence and no full episode model.
**Gate 3 — Security:** Correct identity of Supabase deployment, deployed auth function, RLS/grants, privileged RPCs, consent/retention, access logging and cross-tenant negative tests. No real patient uploads until done; founder wants no fictional data in UI.
**Gate 4 — Professional validation:** Licensed pharmacist/clinician reviews; expert-adjudicated discrepancy recall, false flags, uncertainty preservation, added time burden; benchmark against ordinary history form. For actual patient studies, clinical/site approval, legal basis, ethics as necessary.
**Gate 5 — Optional scaling:** Only after value established add AI-assisted name extraction with cited source spans/human confirmation; limited FHIR data exchange once rights and interfaces verified. Avoid autonomous prescribing, interaction clearance or herb-dosing claims.

**Cost separation:** coding a basic vocabulary lookup and workflow can be tested using free tooling/public data; professional validation, security, regulatory assessment, staff training, integrations and operating compliance are not free. No invented project budget; quote costs only after pilot scope, hosting/data storage, review burden and regulatory category established.

## Specific safety/regulatory consideration
NAFDAC published *Guidelines for Registration of Software as a Medical Device (SaMD) in Nigeria*, effective July 2024. Whether MedPAi is regulated depends on its actual intended use and features, and specialist Nigerian regulatory review is required; clinical guidance/diagnosis claims can affect classification. https://nafdac.gov.ng/wp-content/uploads/Files/Resources/Guidelines/DR_And_R_Guidelines/Guidelines-for-Registration-of-Software-as-a-Medical-Device-SaMD-in-Nigeria.pdf

## Research unknowns
- Nigeria EML 2024 exact redistribution license, machine-readable availability/quality, country-brand mapping coverage.
- Whether NAFDAC grants bulk or API commercial use; don't assume based on public web access or unofficial scrapers.
- Drug naming match/error rates in Nigerian community setting; herbal mixtures vary and may have undisclosed ingredients.
- Cost of clinical validation and compliant production in a specific licensed partner setting.
- Whether any licensed operator will pay, and whether integration into an existing system is better than standalone software.
- No actual data import, approval, clinical database, funding or grant secured by this research.
