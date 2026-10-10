# MedPAi — Master Handoff and Engineering Continuity

**Status:** Canonical repository continuity record; updated 2026-10-10. Check Git history and latest CI for actual release status.  
**Created:** 2026-10-09 (Africa/Lagos).  
**Target repository:** `okoyeDelight/medp-ai` (`main`).  
**Product identity:** The existing React/TypeScript MedPAi application originally built with Lovable, **not** the older `okoyeDelight/MedP-Ai-` Python/Streamlit project.  
**Owner's standing direction:** Build MedPAi as an independent, portable, evidence-led healthcare product using a **zero-cash-budget development approach** and the available GitHub Student Developer Pack, with as little manual work required of the owner as practicable.

> **READ FIRST:** This file is the project's current continuity anchor. It records decisions, rationale, constraints, evidence, tested implementation status, remaining unknowns, migration risks, and work history. Read it before changing product strategy or code. **No password, OTP, access token, patient information, or other credential may be put in this document.** It is not a security boundary.

## 0. How a fresh development session must begin

1. Read this entire file and the latest appended work-log entries.
2. Inspect the **live current** MedPAi repository `main`, commit history, pull requests, GitHub Actions, existing architecture, and relevant production/deployment configuration. Written continuity can be stale.
3. For Care Handoff-derived reasoning, read `okoyeDelight/CAre-HAndoff-2` → `AGENTS.md`, `CHATGPT_MASTER_CONTEXT.md`, `PROJECT_CONTINUITY.md`, and `MASTER_HANDOFF_CURRENT.md`; use the competition repo only as the frozen historical artifact.
4. If discussing comparisons to NFCPS or PARABLE, inspect their actual current repositories first. Do not infer implemented features merely from the user's recollection or historic cross-project notes.
5. Classify every statement as **verified implementation**, **documented historical finding**, **requirement**, **hypothesis**, **proposal**, or **unresolved question**.
6. Before writing, decide what precise problem the change addresses, what simpler alternative exists, how it may fail, and how success and regression will be tested.
7. Implement and test when connected tools permit. Never say a change is committed, deployed, tested, or live without evidence.
8. When a change is made, update this master handoff **in the same change/commit**, including file paths, migration effects, provider/cost implications, commands and test results. Document unsuccessful experiments and rejected proposals too.
9. Preserve existing working behavior; never push credentials, actual patient data, or unreviewed clinical safety claims.
10. Keep account/tool limitations explicit. A conversational password or project instruction on a shared ChatGPT account cannot technically enforce GitHub access control. GitHub repository rules and separate secure identities are the actual controls.

## 1. The collaboration and reasoning method

**The governing sequence is:**

> Evidence → Attack / what breaks → Surviving solution → Constraint test → Kill criterion.

This was developed through the World Bank / Hack-Nation Small AI work and is a higher-level method, **not** a command to copy the Care Handoff product into MedPAi.

- Research to learn what is true, not decorate a pitch. Prefer official standards, primary studies, credible implementation evidence and actual experiments.
- Challenge novelty: how do existing products, paper, spreadsheets, simple forms, deterministic rules, or a standard EHR already address the problem?
- Identify the **moment of use**, operator, beneficiary, payer, decision owner, and incentives. Do not create extra unpaid data-entry work.
- Look beyond healthcare for viable mechanisms; then test physics, permissions, hardware, cost, privacy, literacy and deployment reality. Possible is not the same as deployable.
- Reuse existing infrastructure before requiring new hardware, accounts, platforms or subscriptions.
- Keep questions closed: each material question produces a decision, experiment, explicit assumption, or rejection with reasoning.
- Treat uncertainty and failure as first-class outcomes. Do not paper over unknowns, conflicts, missing evidence, provider failure or a failed test.
- Separate facts, strategic inferences, current hypotheses and aspirations. Keep implementation, prototype, simulation, independent validation and clinical deployment distinct.
- Define kill/redesign conditions before becoming attached to a solution. Preserve negative results.
- Do not invent external endorsements, cost allowances, model accuracy, clinical standards or compliance status.

**World Bank lesson:** Ask both **“Does it work?”** and **“Should it exist in the real world under resource constraints?”**. Sponsor credits should help a chosen solution, not choose the problem.

## 2. Product identity and thesis

### Leading hypothesis — still subject to adversarial testing

> MedPAi reconstructs what a patient is actually taking — not just what was prescribed — and exposes the supporting evidence, conflicts, timeline changes, and unknowns before the next medication decision is made.

Possible sources: current and historical prescriptions, pharmacy dispensing records, patient and caregiver statements, actual-use reports, medicine packs/photos, OTC/self-medication, herbal/traditional products, brand substitutions, dose changes, stopped medicines, imported records and clinician notes.

These are **not interchangeable**:
- Prescribed ≠ dispensed.
- Dispensed ≠ actually taken.
- Possessing a pack ≠ taking the medicine.
- Historic record ≠ current use.
- Patient report ≠ independently verified fact.
- AI recognition/normalization ≠ clinical authority.

The intended unit of work is a **medication episode and longitudinal medication state**, not a flat list. MedPAi is a professional-facing medication-reality/medication-transition intelligence **sidecar**, not an autonomous doctor, generic health chatbot, full EHR, drug registry or supply-chain platform.

### Relationship to other products

- **CAre HAndoff:** encounter continuity and clinician-attention preservation. Unit: encounter/handoff.
- **MedPAi:** longitudinal medication reality, discrepancies and human verification across care transitions. Unit: medication episode and verified current-use snapshot.
- **Datafactor:** medication availability and supply-chain context, if developed/integrated separately.

Share evidence/authority principles only after abstractions prove reusable; do not merge repositories for aesthetics.

## 3. Working principles for clinical evidence and authority

Every medication claim should preserve separable dimensions:

1. **Identity:** raw captured name, proposed normalized concept, brand, ingredient, strength, form, route, dose, frequency. Never silently guess.
2. **Source/authority:** patient-reported, caregiver-reported, clinician-prescribed, pharmacy-dispensed, imported record, system-derived, etc.
3. **Lifecycle:** prescribed, dispensed, started, taking, changed, held, stopped, completed, uncertain/unknown.
4. **Review state:** unreviewed, confirmed, rejected, conflicting, requires verification.
5. **Time:** current, historical, planned, unknown/ambiguous; timestamps and freshness rules.
6. **Evidence:** exact source and span, source ID, timestamp, model contribution where applicable, verifier and verification event.

Conceptual entities: Person; Encounter/Transition; MedicationConcept; MedicationAssertion; MedicationEpisode; EvidenceSource; ConflictSet; VerificationEvent; SafetySignal; MedicationHandoff.

### AI boundaries

AI may propose medication mentions, exact source spans, possible normalizations, dose/frequency extraction and possible contradictions. It may not silently resolve conflict, prescribe, diagnose, decide a stop/start, infer adherence from a prescription, upgrade source authority, or invent drug-interaction knowledge.

Safety/clinical warnings require trustworthy, versioned sources and review. Missing data or uncertain results remain visible. Clinical knowledge quality must **not** degrade when a preferred AI provider is unavailable.

### First MVP hypothesis

One professional medication-reconciliation moment: combine at least two imperfect medication sources plus the person's report; surface current picture, discrepancies, changes and decision-relevant unknowns; let an authorized professional verify and create an approved snapshot. Select one transition context (e.g. community pharmacy **or** outpatient prescribing **or** admission/discharge), not all simultaneously.

Test against an ordinary medication-history form and existing workflow using review time, discrepancy recall, false discrepancies, erroneous authority promotion, safe abstention, unknown preservation and user workload. If a simple method wins overall, redesign or remove the AI.

## 4. The existing MedPAi application: previously verified findings (2026-10-09 review)

> These are point-in-time findings read from GitHub in a prior session, not a fresh live audit. Re-check before edits.

- Target repo: `https://github.com/okoyeDelight/medp-ai`; at the review point, `main` HEAD `1b81291004c5d46e6953f147bbe1fb4bf7183ded` (2026-10-08).
- Existing app: React 18, TypeScript, Vite, Tailwind, Radix/shadcn, Supabase integration; areas for patient triage, pharmacy/hospital dashboards, consultations, plant/herbal scanning, patient profile, safety features and care workflows.
- Present Lovable-related dependencies/integration: `@lovable.dev/cloud-auth-js`, `@lovable.dev/mcp-js`, `src/integrations/lovable/*`, `.lovable/*`, and other tooling. **Do not assume each can be removed without breaking auth, backend, deployment or build.**
- `src/lib/healthProfile.ts` represents `active_medications` as `string[]`: not sufficient as the longitudinal source-linked medication evidence model.
- `src/lib/drugInteractions.ts` contains specific herb dose/warning text and a `MILD / SAFE` severity display token; clinical sources/claims require audit before any patient-facing use.
- Existing clinical workspace and provider integrations are **potential reusable assets**, not proof of production safety or completion.
- `docs/SUPABASE_SECURITY_AUDIT.md` (2026-10-08) documents serious unresolved findings: problematic live signup behavior (source-side fix not deployed), consultation-session authorization policy risks, unverified live RLS/grants/storage controls, and disagreement between connected-project and repository Supabase references. The actual deployment must be verified before changes.
- The 2026-10-08 application CI on HEAD failed at lint with **126 errors and 23 warnings**; tests/build were skipped. A later successful **Dependabot job** is not a successful application CI run. CI history: `https://github.com/okoyeDelight/medp-ai/actions/runs/37746759224`.
- Older `okoyeDelight/MedP-Ai-` appears to be a separate Python/Streamlit codebase; not the target application.

**Immediate engineering priority:** stabilize baseline, audit security/deployment, identify Lovable coupling, preserve valuable features, then introduce evidence-domain model and a narrow reconciliation workflow. Never use live patient data to test an unverified environment.

## 5. Zero-cash-budget and provider-independent architecture

### Non-negotiable requirements — stated by the owner

- Development should target **zero out-of-pocket cost**. The owner has GitHub Student Developer Pack benefits, but benefits and free quotas must be checked for current availability; they are not permanent/unlimited.
- The owner prefers that the assistant operates tools directly rather than asking for repetitive copy/paste, dashboard hopping, or terminal instructions.
- One exhausted credit balance or disabled provider must not force a product rewrite.
- Keep existing code and data portable. Avoid provider-specific business logic spreading through UI/domain modules.
- Favor open standards, ordinary repositories, environment-driven configuration, exportable data, small replaceable adapters, and a primary-plus-fallback strategy **where semantically safe**.
- Avoid paid subscriptions, automatic paid upgrades, hidden storage/egress costs, and critical features dependent on temporary sponsor credits.

### Suggested portability seams — architectural proposals, not implemented claims

| Concern | Portable core / contract | Replaceable implementation(s) | Safe fallback / limit |
|---|---|---|---|
| Source/build | Git, TypeScript, standard Vite build, lockfile and CI | GitHub-based development tools | Repository clone/build independent of Lovable UI |
| Frontend hosting | Static build artifact and configuration | Current host initially; alternatives after verification | Backup host possible; DNS/certificates require explicit migration |
| Authentication | Application-owned auth/identity adapter and server-enforced authorization | Existing auth now; alternative later | No anonymous clinical records on auth outage; fail closed |
| Relational data | Versioned SQL migrations and documented portable schema | PostgreSQL/Supabase today; other PostgreSQL deployment later | Export + restore drills; **database failover is not instantaneous** |
| Storage | Logical object-storage interface and stable object IDs | Existing service, later compatible alternatives | Do not lose or expose health records during migration |
| AI text tasks | Versioned `extractMedicationEvidence()` contract with typed schema, source spans and confidence/abstention | Multiple approved model backends, small/local model where feasible | Deterministic/manual capture if no approved model works |
| Clinical knowledge | Versioned evidence database and deterministic rules | Trusted independently reviewed knowledge sources | Do **not** replace missing knowledge with a hallucinating model |
| Interoperability | Rich internal evidence model + tested adapters | JSON, future FHIR/NDHA profiles | Never silently flatten provenance/conflicts |
| Notifications | Non-sensitive event contract | Configured email/SMS/other channels | Queue/retry non-urgent; avoid health details in previews |
| CI/deployment | Repeatable scripts and config-as-code | GitHub Actions; alternate runner if needed | Avoid deployments when security/test gates fail |

### Critical distinction: what can and cannot automatically fail over

**Stateless model requests** may switch providers following an explicit, tested policy, subject to patient-data permission, compatible schemas, timeouts, retries, rate limits, costs, and quality gates. A provider switch must not silently substitute an unvalidated model for medically consequential output.

**Stateful data and authentication** cannot safely be swapped merely because free credits run out. They require ownership and export access, verified backups, compatible schema, key/secret rotation, DNS/auth callback changes, migration testing, and recovery planning. Prefer graceful degradation and a safe maintenance/read-only mode over a dangerous automatic switch.

**No provider available** is a valid system state. The app must remain usable for permitted deterministic/manual workflows and must not invent output.

### Provider adapter contract (proposed)

Each replaceable provider should expose capabilities and limits rather than contaminate domain code with SDK-specific behavior:

- `providerId`, purpose, capabilities, schema/API version and region/data-processing policy;
- credential availability checked server-side without displaying or logging secrets;
- `health()` / status, timeout, max attempts, retryable/non-retryable errors;
- quota exhausted / credit depleted / rate limited / offline states handled distinctly;
- configured priority, approved backup(s), cost ceiling and explicit data-egress permission;
- deterministic normalization to an internal response including source trace, confidence, uncertainty, provider/model version, usage/cost metadata where permitted;
- measurable test cases covering exhaustion, network failure, invalid output, partial response, unsafe fallback and recovery;
- safe failure when no compatible/authorized provider is available.

No “random provider roulette,” cross-border clinical-data sharing without approval, or silent switch that changes clinical interpretation.

### Migration off Lovable — proposed sequencing

1. Inventory framework/runtime, Lovable-specific modules, auth behavior, Supabase ownership/project references, secrets configuration, deployment URLs and persisted data.
2. Pin known build and establish tests; fix existing CI separately from business-function refactors.
3. Replace only genuinely required Lovable-specific SDK calls with app-owned interfaces; keep working non-Lovable React components.
4. Reproduce build and a staging deployment independently of Lovable; verify auth callback flows, DB permissions, error states and performance.
5. Verify backups and rollback before moving production routing, users or data.
6. Remove residual Lovable dependencies/config only after integration tests and independent deploy pass.
7. Document each removed dependency, destination, config change, rollback mechanism, evidence and actual cost.

This is **not** authorization to delete the live Lovable project or change DNS, database identity, secrets or billing without an explicit migration plan.

## 6. PARABLE and NFCPS lessons — architecture requirements and 2026-10-10 source inspection

**Confirmed owner requirements / historical continuity:** These projects motivated avoiding single-provider dependence, being able to route around exhausted credits, and reducing manual work. PARABLE's earlier multi-AI-provider work exposed rate limits, quotas and billing fragility. The CAre HAndoff cross-project continuity mentions lessons about provider choice, operational resilience and maintaining working deployed products.

**Inspection update 2026-10-10:** Both repositories were read directly on GitHub. Verified implementation observations follow below. Runtime deployment health, actual available credits, account ownership and real seamless provider-failover behavior remain unverified; code presence does not prove those operational outcomes.

**Target NFCPS/PARABLE audit questions:**

1. What adapter boundary keeps business logic independent of the vendor SDK?
2. What are the configured primary/secondary providers and how are credits/exhaustion detected?
3. How are transient failures differentiated from exhausted balances, unsafe outputs and configuration errors?
4. What remains functional with every AI key missing?
5. Which deployment, database and storage components are truly portable vs tied to a service?
6. How are secrets isolated, cost ceilings set, and free allowances monitored?
7. Are fallback tests and an operational runbook actually implemented?
8. Which mechanisms transfer safely to patient-medication workflows, and which should **not** be copied?

Audit target links: `https://github.com/okoyeDelight/Nfcps-book-library` and `https://github.com/okoyeDelight/PARABLE`. The latter is private; access may require the existing authorized GitHub connection.


### Verified NFCPS implementation — checked 2026-10-10

**Read directly:** `okoyeDelight/Nfcps-book-library` `main`, including `NFCPS_ONE_MASTER_HANDOFF.md`, `NFCPS_ACADEMIC_HANDOFF_CURRENT.md`, repository tree and GitHub Actions. The public compatibility repo is not the complete clean source of the deployed frontend. Consequently do not copy assumptions about a unified switchable hosting architecture into MedPAi.

- **Continuity/compatibility under provider changes:** `nfcps-bootstrap.json`, `nfcps-bootstrap-v2.json` and `nfcps-update.json` serve as compatibility/update configuration while the frontend and services have moved through AppDeploy, Vercel, Hatchable, Supabase and Render.
- **GitHub-operated free infrastructure:** `.github/workflows/watch-crawler.yml` runs a scheduled Watch feed and publishes to the `nfcps-live` branch; `.github/workflows/movie-crawler.yml` publishes the Cinema catalogue to `nfcps-movies`; separate publish workflows produce `nfcps-web` and `nfcps-apk` artifacts. These provide genuine infrastructure-independent versioned outputs, but scheduling, quotas and build success must still be verified.
- **User experience principle:** “Expose the benefit. Hide the machinery.” Students see books/content, not host names, crawlers or raw storage URLs. For MedPAi, clinicians should see evidence, conflicts, unknowns and review actions—not provider names, credit counters or model settings.
- **Documented migration costs and mistakes:** a Vercel catch-all proxy caused a black screen; a new host opened Chrome rather than an installed Android experience; free Render cold starts added substantial delay; Vercel compiled-bundle patching and incomplete clean frontend source are current technical debt; a provider migration caused authentication/feature regressions. Therefore MedPAi must preserve the canonical source, stable URLs, auth/session continuity and tested rollback and smoke tests. **NFCPS shows survival through migrations, but is not proof of seamless automatic failover**.
- **Cost practice:** free tiers, GitHub Actions and existing capacity can defer founder spending but are not unlimited or guaranteed. Portable artifacts and automated deployment are more durable than repeatedly chasing promotions.

Source anchors: `NFCPS_ONE_MASTER_HANDOFF.md`, `NFCPS_ACADEMIC_HANDOFF_CURRENT.md`, `.github/workflows/`, `nfcps-bootstrap.json`.

### Verified PARABLE implementation — checked 2026-10-10

**Read directly:** `okoyeDelight/PARABLE` `main`, `MASTER_HANDOFF_CURRENT.md`, `docs/provider-portability.md`, `docs/runtime-portability-v1.md`, `docs/hosting-portability.md`, `docs/database-portability.md`, `docs/handoff/providers-inference-economics.md`, and `server/functions/_lib/provider-resilience.mts`.

- **App-owned contracts:** PARABLE treats AI inference, compute hosts, durable jobs, object storage and transactional data as replaceable implementations. Story logic does not own a provider SDK. For MedPAi, evidence semantics and clinical safety policy must live above all AI/storage vendors.
- **Failure classification and circuits:** `provider-resilience.mts` classifies quotas/credit exhaustion, rate limits, auth failure, timeouts, upstream unavailability and invalid responses; provider guard leases and cool-down/circuit status are implemented with a transactional backend and a documented compatibility mode. **Do not claim all paths are proven in production merely from code presence.**
- **Host portability:** PARABLE builds an OCI/container release tagged by commit SHA and hosted in GitHub Container Registry; generic Node runtime support and a host-neutral release verifier are described in `docs/hosting-portability.md`. A new host needs a deployment adapter/settings rather than a product rewrite.
- **Database portability:** PostgreSQL schema plus a provider-neutral state-RPC facade supports migration away from Supabase in principle. Data copy and gateway setup remain real work, not zero-click failover.
- **Budget and privacy constraints:** providers are routed according to capability, measured quality, quota, policy and cost. An unavailable AI route must not invent an answer or downgrade clinical evidence. In MedPAi, the last-resort fallback is **safe manual recording/review**, not a medically unverified model.

### Concrete MedPAi portability contracts and pass/fail gates

These are **requirements, not implemented MedPAi features as of this entry**.

1. **AI port:** one versioned `MedicationEvidenceCandidate` schema (exact source span, proposed entity, confidence/abstain, source metadata); provider adapters may propose candidates only. Hard gates ensure no AI can confirm a medication or infer actual ingestion. A no-API-key manual path must still work.
2. **Failure router:** typed categories for quota, rate limit, auth/configuration, timeout, service outage, invalid response, safety failure. Retry only where safe/idempotent, stop on unsafe schema, and never route patient data to unapproved processors as a “fallback.”
3. **Portable app build:** standard Vite/React artifact and documented environment names; no required Lovable editor/runtime for builds. Replace vendor dependencies only after authentication and production parity tests.
4. **Portable persistence:** versioned SQL migrations, access-policy tests, backup/export/restore drill, provider-independent domain data; confirm the real Supabase production project and row-level security first.
5. **CI gate:** tests for provider quota exhaustion, all providers unavailable, manual fallback, response schema mismatch, authority promotion, conflict preservation, and basic deployed-app smoke checks. CI failing at lint is a current blocker.
6. **Release/cost discipline:** Git commit identity, reproducible release, current provider/backup choices, costs and allowances measured, a no-surprise-billing posture, migration checklist, and rollback path. Do not claim zero-cost at scale.

### Shared ChatGPT account security boundary — 2026-10-10

The ChatGPT sign-in is shared. MFA on that shared ChatGPT account can affect other account users and must not be changed without the account owner's consent. GitHub MFA protects the **separate GitHub account sign-in**, but does **not** force MFA on every use of a pre-authorized connector inside ChatGPT. A chat password, OTP pasted into chat, or project instruction is **not** a reliable access-control mechanism against other users of the same account. Do not embed credentials, one-time codes or email verification secrets in this repository. Enforce high-impact write controls with GitHub-native permissions/branch protections; a separate private ChatGPT identity is the stronger boundary for connected private repositories.

## 7. Evaluation and clinical truth

- No clinical use, treatment instructions or live sensitive patient data until privacy, professional safety review and deployment security are adequate.
- Compare against a strong simple baseline: standard medication-history form or current pharmacist workflow.
- Proposed metrics: medication extraction exact-span precision/recall; normalization errors; discrepancy recall and false alarms; preservation of UNKNOWN; false authority upgrades; verification time; user burden; recovery from no internet/no AI quota; proper abstention.
- Blind test cases must remain held out. Once inspected for tuning, reclassify as development data.
- Safety rules must be deterministic and testable. Use versioned evidence sources for any clinically consequential warning.
- Do not claim WHO, World Bank, Nigerian government or NAFDAC endorsement; policy alignment is not approval or product validation.
- Regulatory intended-use and data-protection obligations need professional assessment before deployment.

## 8. Development phases (prioritized and revisable)

**Phase 0 — audit/stabilize:** NFCPS/PARABLE source inspection; MedPAi baseline run; failed CI triage; security/deployment/integration inventory; cost and lock-in map.

**Phase 1 — portability foundations:** app-owned provider contracts, typed errors and retry safety, minimal provider health/usage reporting; tests proving stateless provider rotation is safe; controlled Lovable decoupling.

**Phase 2 — medication evidence model:** schema, assertions, episodes, provenance, time, review and conflict invariants; synthetic datasets and tests.

**Phase 3 — one professional reconciliation workflow:** existing screens reused where appropriate; exception-first review; verified medication snapshot; safe manual/AI-offline fallback.

**Phase 4 — validation and integration:** baseline comparisons, professional usability, security testing, controlled pilot with approval, data export/interoperability and deployment portability exercises.

Do not build a general-purpose EHR, multi-provider medication marketplace, national patient registry or autonomous medicine recommender as a shortcut.

## 9. Decision register — append with every substantive session

| ID | Date | Decision / status | Rationale and conditions | Evidence / reference |
|---|---|---|---|---|
| D-001 | 2026-10-09 | **Adopt** `okoyeDelight/medp-ai` as the MedPAi build target | Existing Lovable-origin React product, not the older Streamlit repository | GitHub project review recorded in current conversation |
| D-002 | 2026-10-09 | **Adopt** direct source engineering; Lovable independence as a goal | Owner does not want to depend on Lovable for future development | Owner direction in current conversation |
| D-003 | 2026-10-09 | **Adopt** zero-cash-budget-first; GitHub Student Pack as optional resource | No budget; benefits expire/change; avoid surprise charges | Owner direction; allowances need current verification |
| D-004 | 2026-10-09 | **Adopt** cross-provider portability and tested primary/fallback behavior | Loss of free credits must not require a rewrite | Owner's NFCPS/PARABLE reference; exact code unverified |
| D-005 | 2026-10-09 | **Adopt** Care Handoff's adversarial reasoning discipline, not its product scope | Evidence → Attack → Surviving solution → Constraint test → Kill criterion | `CAre-HAndoff-2/CHATGPT_MASTER_CONTEXT.md` |
| D-006 | 2026-10-09 | **Leading hypothesis, not frozen**: medication-reality / reconciliation sidecar | Stronger than generic medical chatbot, but must beat non-AI baseline | MedPAi sections 77–124 in Care Handoff master context |
| D-007 | 2026-10-09 | **Adopt** repository master handoff and ongoing change ledger | Future chats must preserve every material decision and implementation rationale | Owner direction in current conversation |
| D-008 | 2026-10-09 | **Defer** removing Lovable/Supabase integration until audited | Existing authentication/data/deployment risk | Prior repo review; security audit |
| D-009 | 2026-10-09 | **Superseded on 2026-10-10:** NFCPS/PARABLE were initially unverified | Read-only GitHub inspection now completed; actual live operational failover still unverified | See section 6 below |
| D-010 | 2026-10-09 | **Adopt** explicit failure modes over unsafe medical AI fallback | Clinical safety and verifiable authority outrank provider availability | Care Handoff principles |

## 10. Implementation and session log — append-only

### 2026-10-09 — Foundation and continuity creation

**Requested:** Inspect NFCPS and PARABLE for replaceable provider/credit patterns, work with minimal budget and manual setup; create a MedPAi master handoff documenting discussions, architecture, work and rationale going forward.

**Confirmed:** Owner selected the existing Lovable-origin `medp-ai` application as source target; authorized code/repository development. Earlier GitHub inspection covered the MedPAi and CAre HAndoff repositories. The current session did **not** obtain live GitHub repo read/write tools. Public GitHub browsing also failed for the target owner, and the execution container had no GitHub network access. Current NFCPS/PARABLE source therefore **not inspected**, and no remote commit made.

**Work performed:** Created this standalone handoff document with historical findings, portability constraints, safety boundaries, decision register, first-phase plan and a continuing logging protocol.

**Validation:** File creation can be checked locally. No application unit test/build/CI or deployed service was changed or run. This document is not yet synchronized with GitHub.

**Next when GitHub access is available:** (1) inspect NFCPS and PARABLE current trees/code and document exact provider/fallback mechanisms; (2) inspect MedPAi current `main` and CI; (3) add this handoff as `MASTER_HANDOFF_CURRENT.md` to the MedPAi repository; (4) add a small `AGENTS.md` pointer if appropriate; (5) include this file in every later implementation commit; (6) begin audited CI/security and portability work in small tested changes.

### 2026-10-10 — GitHub restored; NFCPS/PARABLE verified; handoff synchronized

**User instruction / question:** Continue working inside the current shared ChatGPT Project, use the reconnected GitHub integration, avoid changing ChatGPT-account MFA because it is shared; inspect NFCPS/PARABLE and commit MedPAi master handoff.

**Evidence and current state:** GitHub connector returned read/write/admin permissions on `okoyeDelight/medp-ai`, `okoyeDelight/Nfcps-book-library`, and `okoyeDelight/PARABLE`. MedPAi `main` remained at `1b81291004c5d46e6953f147bbe1fb4bf7183ded` prior to this documentation commit; no master handoff file existed there. PARABLE and NFCPS source findings are recorded above.

**Alternatives and failure attack:** ChatGPT MFA on a shared account is not per-project and cannot protect an already connected GitHub integration from all other shared-account users. Do not claim automatic one-credit-exhausted failover without a tested secondary provider and identical safety/privacy contracts.

**Decision:** Synchronize the existing comprehensive draft to the MedPAi repository and retain future decisions and change logs there; do not modify application, credentials, settings, or deployment in this documentation-only change.

**Code changed:** `MASTER_HANDOFF_CURRENT.md` (documentation); commit SHA recorded in GitHub history.

**Providers/cost/clinical implications:** Documentation only; ₦0 incremental infrastructure commitment, no patient data or clinical decision functionality touched.

**Tests:** GitHub file readback required after commit; no app tests/build run for a documentation-only change.

**Next action:** Add enforcement to developer workflow (handoff update with every substantive code change), then address CI and Supabase security before new clinical features.

## 11. Required format for every future change-log entry

Append an entry under section 10; never silently rewrite history. Use:

```
### YYYY-MM-DD — Short change title
**User instruction / question:**
**Evidence and current state:**
**Alternatives and failure attack:**
**Decision (accepted/rejected/deferred):**
**Why / kill criterion:**
**Code changed (paths, commits, PR):**
**Providers, quotas, secrets-handling, cost, data/clinical implications:**
**Tests and exact outcomes:**
**Deployment status / rollback:**
**Known limitations / unresolved questions:**
**Next action:**
```

For purely strategic discussions, mark **Code changed: none** and capture the reasoning. For implementation sessions, note exact diff, test and deployment facts. **Do not include private passwords, OTPs, API keys, patient data, or raw sensitive logs.**

## 12. What remains unknown as of this first handoff

- Exact current NFCPS and PARABLE fallback implementations and their test quality.
- Which GitHub Student Pack offers are active and applicable to this owner's account today; **do not assume quotas**.
- Who currently controls MedPAi's production Lovable/Supabase resources and what depends on them.
- Whether MedPAi's current code/CI has changed since the cited October 8 commit.
- Current commercial/free-tier costs, usage alerts, provider quotas and potential overage exposure.
- A validated and economically viable first user, clinical transition moment and deployment partner.
- Real-world medical and language performance, professional acceptance, regulatory classification, data-protection arrangements and workflow benefit.

**Working promise:** Preserve decisions and tests with the code. Don't substitute confidence, a pretty interface, or credit availability for evidence. Don't claim portable architecture until a second provider/deployment has actually passed a controlled migration or failover test.

## 2026-10-10 — Safety-critical interaction UI correction (review branch)

**Risk discovered by source inspection:** `src/components/SafetyGate.tsx` marked green interaction rows “SAFE”, automatically advanced to “All clear — proceed” after a user tapped “No, nothing”, and allowed “Continue with remedy” after a limited list had no red entry. `src/lib/drugInteractions.ts` also labeled mild interactions “MILD / SAFE”. These claims could mislead patients: absence of a listed interaction does not establish safety, particularly for variable herbal products and incomplete medication histories.

**Action on branch `safety/interaction-claims-20261010`:** Removed automatic clearance and the direct proceed-to-remedy action from the SafetyGate, routed both known-medication and no-known-medication responses to the information screen, displayed a warning that the interaction list is incomplete and not a safety clearance, replaced the proceed button with a pharmacist-review action, changed green rows to “NO FLAG LISTED” with caution styling, and changed “MILD / SAFE” to “MILD — NOT PROVEN SAFE” with caution styling.

**Safety boundary:** This is a conservative UI mitigation, **not clinical validation**. It does not establish that underlying herb doses, references, interaction datasets, patient triage, or backend policies are safe. Static source review only; no live patient testing. The app's old `onConfirm` pathway is intentionally no longer reachable through this gate; human UX review is needed before release.

**Release policy:** Keep this change on a **draft pull request** pending CI, focused interaction testing, qualified pharmacist/clinician review, and confirmation that all remedy entry points are protected. Existing CI is known to fail; do not merge just to show green progress.

**Open high-priority blockers:** Live Supabase project mapping/RLS and consultation-session permissions unverified; deployed signup function may differ from source; clinical claims/doses and triage require authoritative evidence review; CI lint and lockfile require repair. No real patient data or production claims until these are resolved.


## 2026-10-10 — Patient-facing remedy quarantine and CI visibility (PR #8)

**User direction:** Continue development directly in GitHub; preserve a comprehensive, contemporaneous handoff for every material step; prevent loopholes because errors in health software can cause patient harm.

**Evidence — actual repository inspection:** GitHub Actions run `38038629298` on this branch completed with **126 ESLint errors and 23 warnings**, so tests and production build were skipped. A separate historical main run `37754616399` reported success; this does not establish the new branch is healthy. `src/pages/PrivacyPolicy.tsx` had a missing closing `</p>` JSX tag. `src/components/RemedyDetail.tsx` displayed actionable herbal preparation and dosing, triggered dose logging from `PrepTimeline` without requiring `SafetyGate`, and offered reminders. `src/data/remedies.ts` contains concrete treatment, safety and efficacy claims, including green “safe combo” records and proposed doses, without completed clinical evidence review. Even after the previous SafetyGate mitigation, the separate preparation timeline was an unguarded route to harm.

**Safety decision:** Until qualified clinical review and end-to-end verification, **quarantine** the patient-facing remedy use path. A prominent clinical-review warning replaces dosage/preparation instructions, consumption logging, alarms, and unverified science snippets on the remedy detail page. The interaction gate now withholds all individual unverified interaction claims and provides only a conservative warning and pharmacist-referral action. This intentionally removes functionality to reduce foreseeable harm; it does not clinically validate the remaining product or prevent use of unreviewed content on other pages.

**Files changed on draft branch:** `src/components/RemedyDetail.tsx` (reduced to non-actionable identity, review hold and pharmacist referral), `src/components/SafetyGate.tsx` (no individual claims/clearance), `src/pages/PrivacyPolicy.tsx` (fix JSX closing tag), `.github/workflows/ci.yml` (run tests and build after lint failure, retaining overall failure), `src/components/RemedyDetail.safety.test.tsx` (rendered regression test with deliberately unsafe fixture). Earlier branch changes to `src/lib/drugInteractions.ts` remain. No live database, patient data, provider secrets or production deployment touched.

**Important scope limit:** This is a **partial safety hold**, not a full app-wide lock. Other pages and datasets may still expose unsafe remedies, triage, interactions or medical advice. Inspect and gate all routes before deployment. `PrepTimeline` and `src/data/remedies.ts` still exist in the source for future evidence-led remediation, but the new RemedyDetail does not render them. Direct database access and Edge Function safety remain unverified.

**CI/release policy:** The new Vitest regression test and build must be observed on GitHub Actions; source-level assertions are not proof of runtime safety. CI lint remains a required failing check, not silenced. Do not merge PR #8 until CI passes, the remaining remedy entry points are audited, a qualified clinician/pharmacist reviews patient-facing content, and Supabase project mapping/RLS/authorization is verified. No clinical-validation, privacy-compliance or production-safety claims.

**Next work:** inspect latest CI test/build outcome, resolve compilation issues and baseline lint without blanket suppression, inventory all patient-facing remedy/triage routes, verify authority and citations, and add clinically governed content publication gates.


## 2026-10-10 — Hosting migration requested: Lovable → Vercel (preparation only)

**User instruction:** Move MedPAi away from Lovable to Vercel or Netlify so GitHub changes can be previewed directly, while preserving the full handoff. **Vercel chosen as preferred target** for a Vite/React static frontend. This is a request to move the frontend hosting, not permission to delete the Lovable project, production backend or patient records before verification.

**Verified repository facts:** `vite.config.ts` imports `lovable-tagger` and `@lovable.dev/mcp-js/stacks/supabase/vite`; `package.json` also depends on `@lovable.dev/cloud-auth-js`. `src/integrations/supabase/client.ts` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. `supabase/config.toml` names a project ID but does **not** prove which production database is actually connected. No `vercel.json` or `netlify.toml` existed on `main` at inspection. No Vercel connector was connected in this session; an optional Vercel connection was suggested.

**CI evidence:** GitHub Actions run `38040385429` (branch SHA `cad86861`) had lint **failure**, but tests **success** and production build **success** after changing CI to execute these steps even if lint fails. These statuses demonstrate the pipeline commands ran; they do **not** constitute clinical or security validation. The CI run predates the Vercel config commit.

**Code prepared on existing safety draft branch:** Added `vercel.json` with Vite build output `dist`, client-side routing fallback for application routes, and a noindex/nofollow/noarchive response header. The noindex header is an indexing instruction, **not access control**. No live site was created or switched and no existing Lovable app was deleted.

**Mandatory migration gates:** (1) Connect a Vercel account and GitHub repository; (2) choose a **protected** non-public preview, with deployment authentication/access restrictions verified in Vercel; (3) use isolated test backend or disable data writes, do not reuse unverified production patient data; (4) configure only intended publishable client variables and server-side secrets in their appropriate locations, never in Git; (5) verify routing, authentication redirects, API endpoints, CSP/CORS, PWA cache updates and Supabase access policies; (6) ensure current draft safety branch, not unsafe `main`, is previewed; (7) test latest build and clinical content hold; (8) verify rollback, DNS and monitoring before any final switch; (9) only then remove Lovable-specific build/runtime dependencies, with lockfile and CI parity; (10) do not delete Lovable or backend until the independent replacement is confirmed.

**Unresolved:** Vercel connection and project ownership; protected preview entitlement; domain choice; exact Lovable/Supabase auth linkage; real backend migration requirements; 126 existing lint errors; app-wide clinical safety. No production migration has occurred.


## 2026-10-10 — Vercel connector activated; existing Git-connected MedPAi project discovered

**Connector verification:** User connected Vercel. We queried Vercel team `okoyedelights-projects` (`team_QjZ90dfgLtug5Rymf0bX6pIK`) and discovered an **existing** Vercel project named `medp-ai` (`prj_Qp0rW1O3o9LI1fxaGgmAZWL4ESYr`). Do not create a duplicate project unnecessarily.

**Actual deployment facts:** The project is configured with framework `vite` and has Git-driven preview deployments for the safety branch `safety/interaction-claims-20261010`. Verified READY preview for config commit `3d07402897826812f6d419af073b42cb9cc4c538`: `dpl_961Bk8yMfQwN9jR3SBCrw8zqSyRL`; URL `https://medp-hph9v6m1c-okoyedelights-projects.vercel.app`. A later deployment for handoff commit `7ed886e85d2e661ab4ee9c91fd9477a918d254dc` was BUILDING at first check (`dpl_7kjfFZjhgdgaQNqUCK7BG6VtCWWz`). Project metadata reports `live: false`: **do not describe this as a publicly released production app**.

**Preview protection:** Vercel metadata reports SSO protection **enabled** with `deploymentType: all_except_custom_domains`; password protection disabled. Therefore generated Vercel preview hostnames appear protected, but a custom-domain exception exists and Vercel UI/access checks are required. The `X-Robots-Tag: noindex` directive is not a substitute for authentication. Do not disable protection just to make the preview public.

**Environment configuration:** `filter_project_envs` returned an empty `envs` array and `hiddenProductionEnvCount: 0`. The React Supabase client expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. No values were supplied/added because the repository and connected project IDs are disputed and copying unknown live patient infrastructure into a preview would be unsafe. Browser shell preview may render but authentication/API workflows are not verified. Never put service-role secrets into Vite client variables.

**Migration status:** Git → Vercel preview build is demonstrably working, independent of Lovable's preview editor. **Not** a completed migration: actual patient app workflows and backend/auth on Vercel are not validated, the old Lovable deployment has not been removed, and the clinical safety draft PR remains unmerged. Next: check most recent deployment READY status, verify protected access, arrange isolated preview backend and browser config, remove Lovable runtime dependencies only after auth/backend parity tests, and perform controlled cutover/rollback.


## 2026-10-10 — Vercel preview white-screen incident and fail-closed bootstrap

**User report:** Opening `https://medp-hph9v6m1c-okoyedelights-projects.vercel.app` in Chrome produced a blank white page. The Vercel deployment `dpl_961Bk8yMfQwN9jR3SBCrw8zqSyRL` was **READY**; READY proves build/deployment completion, not browser runtime health.

**Root-cause evidence:** Vercel `medp-ai` environment list had **zero** configured variables. The Supabase client module constructs `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)` at module load. `src/main.tsx` statically imported `App`, which imports authenticated pages that transitively import the client. Therefore missing URL/key can throw before React mounts, leaving the white screen. This is a source-supported likely cause, **not a captured browser-console trace**; other browser/CSP/runtime faults remain possible.

**Mitigation committed:** `src/main.tsx` now validates the presence and basic shape of public Supabase browser configuration *before* dynamically importing `App`. When missing, it renders a clear non-interactive **development preview unavailable** message, with clinical-use and patient-data warnings, instead of attempting to initialize Supabase. It unregisters stale service workers on the hold screen and Vercel preview hosts, and shows a conservative startup failure message if the dynamic app import fails. No dummy credentials, no production database, no health data, and no Vercel environment secrets were added.

**Verification needed:** Check GitHub Actions lint/test/build for SHA `15e90b9171f875390e8c5a5e922cc97d984e8223`; confirm Vercel READY for that SHA; inspect protected preview in an authenticated browser and verify the hold renders rather than a white page. Source-level validation alone cannot prove the browser outcome. Existing legacy lint errors remain a release blocker.

**Do not interpret as migration complete:** The preview intentionally withholds application features until a segregated, verified test backend and access controls are provisioned. The old Lovable deployment remains untouched. No production release.


## 2026-10-10 — Screenshot-confirmed white-page resolution: usable offline-only MedPAi workspace

**User evidence and instruction:** User supplied a mobile Chrome screenshot of the `MedPAi development preview` hold panel and requested that the blocking screen be removed so development can continue. The earlier white blank page was fixed, but the hold itself obstructed product iteration. This change **replaces the hold with an interactive sample workspace**, not unrestricted access to an unverified clinical application.

**Architecture decision:** On `*.vercel.app` preview hosts, `src/main.tsx` dynamically imports `src/preview/MedPAiPreview.tsx` **regardless of whether Supabase variables are later set**. On any host without valid public Supabase configuration, the same standalone sample app is used. The existing full `App.tsx` loads only on non-Vercel hostnames with configured Supabase. This avoids instantiating unverified real patient backends and avoids importing clinical pages that still need audit. No backend credentials, patient data, or persistent writes are used in the sample workspace. Existing Lovable site and production deployment remain unchanged.

**Committed changes on draft safety branch:**
- `src/preview/MedPAiPreview.tsx`: responsive interactive overview, sample reported medicine list (fictional generic items), item flags, selectable pharmacist review questions and generated sample handoff. In-memory React state only. Handoff copy action requires explicit user click and has an error fallback. All records say sample/fictional; no interaction clearance, actual dosing, treatment, clinician verification, or patient data.
- `src/preview/preview.css`: mobile-first navigation, styled dashboard, responsive cards and handoff. Retains existing app design tokens where possible without changing original clinical UI.
- `src/main.tsx`: replace the blocking development notice with safe sample workspace via lazy import; never initialize Supabase in the preview; unregister previous PWA service workers on preview hosts; retain fallback message only for genuine bootstrap failures.
- `src/preview/MedPAiPreview.test.tsx`: React Testing Library tests for overview rendering and end-to-end sample navigation, flagging, question selection and the handoff's explicit no-clearance text.
- `index.html`: replace obsolete claims of safe herbal treatment in the title/metadata with evidence-aware product purpose.
- A follow-up change limits scroll-to-top calls during navigation to cases where scrolling is needed.

**Verified CI evidence:** GitHub Actions run `38041160535` at commit `fe6b04fbbdcd10ed46ca0e414397c69c95b49cdd` completed with **3 Vitest files passing**, including **2 new interactive sample-workspace tests**, and production build **passed**. Existing repository lint still **fails with 125 errors and 23 warnings** (148 total). This run precedes the later index metadata and scroll refinement commits; check latest CI again before claiming exact HEAD verified. Browser display was not independently inspected by an authenticated browser agent. Vercel preview build/deployment status must be checked and link to the new build supplied, **not the old hold-screen URL**.

**Limitations/release gates:** This is a working interface prototype, not the original full patient's app: it lacks authentication, database persistence, import/export of patient data, verification from clinicians and clinical validation. Data is deliberately fictional and ephemeral. Vercel Deployment Protection remains enabled. Avoid disclosing or connecting production Supabase secrets and do not lift preview access restrictions. Full Lovable retirement, secure backend integration, patient-path audits and lint remediation remain future tasks.


## 2026-10-10 — User rejects fictional data: implement real empty-state capture instead

**User correction:** "I don't want fictional data .. this is not a demo." Treat as a binding product requirement. The previous `src/preview/MedPAiPreview.tsx` seeded three invented medicines, a sample case, and sample handoff; this violated the user's requested real-product direction. They were not connected to a backend, but invented records must not appear as real records. **Superseded:** the immediately preceding "sample workspace" decision. Do not reintroduce hard-coded fictional patients, medicines, doses, prescriptions, clinical conclusions, or apparent care encounters into default UI.

**Delivered on safety branch:** `src/preview/MedPAiPreview.tsx` now initializes **zero** reported items and **zero** review selections. Real UI flows allow manually entering a medicine/product name, category, information source, what was reported as used, and uncertainty notes. Entries can be edited, flagged for clarification, unflagged, removed, and summarized into a handoff from the actual entered fields; no fabricated patient information is added. Questions are generic professional-review prompts, not purported encounters, evaluations or clinical results. Copy-to-clipboard is explicit, user-initiated and unavailable on an empty record. Dashboard counts derive from actual entries and can be zero. `src/preview/preview.css` includes new accessible form and empty-state styling. `src/preview/MedPAiPreview.test.tsx` was replaced to test **zero invented records** and add/edit/flag/remove/review flows. `src/main.tsx` now refers to a **capture workspace**, not a fictional sample; the legacy clinical app requires explicit future `VITE_MEDPAI_CLINICAL_APP_ENABLED=true` plus valid backend configuration and never auto-enables on `*.vercel.app`.

**Critical constraints:** This is a real user-operated capture **frontend**, but **not yet a production healthcare service**. The Vercel project has no verified Supabase environment configuration; stored values exist only in React memory (lost on reload). The UI clearly warns **not** to enter patient names, identifiers, or confidential medical information until secure storage/auth/RLS and provider verification are established. No network writes, persistent browser storage, backend credentials, fabricated facts or "safe to take" assessments are introduced. Copied handoff text is placed on the user's clipboard only on their action; warn that clipboard may persist outside the app. A production-ready secure backend, authentication, provenance schema, access control, real persistence, safety evaluation and clinical review remain essential next steps. Do not misrepresent in-memory capture as durable recordkeeping.

**Commits in order:** `bd1683b7` (remove fictional data/add real empty capture), `b8f663c6` (form styling), `1d446f6b` (non-fictional capture tests), `d582c1b0` (explicit legacy clinical app release gate). Latest CI run `38041505085` was queued at the moment of writing; check tests and build, and check Git-connected Vercel READY build before supplying a new URL. Existing historical lint errors remain unresolved. Release and Lovable cutover remain blocked pending security verification and production services.


### 2026-10-10 — Post-change CI and hosted workspace verification

**Test/build results for exact capture code:** GitHub Actions run `38041559829` on commit `a5a019f79236f0023c98c036af42e53bcb995df3` showed **3 Vitest files passing**, including **3 new zero-fictional-records and actual-entry workflow tests**, and production Vite build **success** (`built in 3.26s`). Lint remains failing with **125 errors and 23 warnings** across the legacy codebase; overall CI is therefore **not green**. This is a blocker for production release, not a claim that the captured workflow tests failed.

**Vercel confirmation:** Git-linked deployment `dpl_CpjpisX5xW7vsakdpuoQj9shGsDw` for exact commit `a5a019f7` reached **READY**, URL `https://medp-i82e4jkk7-okoyedelights-projects.vercel.app`. The protected Vercel URL can be opened in an authenticated browser. No independent rendered-browser inspection was performed by the assistant; request screenshot/feedback if needed. Preserve Vercel authentication. Existing main production app and Lovable remain untouched, and no patient storage exists for the new capture workflow.

**Next steps:** Remove outstanding lint issues, define production-safe data ownership and provenance schema, verify Supabase instance/RLS/auth/project mapping and controls against real healthcare risks, obtain qualified clinical review, then implement authenticated backend persistence and integration tests. Never fabricate records to make the app appear populated.


## 2026-10-10 — Deep policy/market research: WHO, UN, Nigeria, NAFDAC and startup wedge

**Founder request:** Stop abstract brainstorming. Research what WHO, the UN system, NAFDAC, Nigerian health regulators and reform bodies are actually doing, where health services are going, and how a constrained startup can enter without doing everything. **No application feature implementation authorized by this research alone.** Full research, citations, competitor audit, wedge alternatives, buyer hypotheses, clinical boundaries and kill criteria committed to [docs/MEDPAI_NIGERIA_WHO_UN_NAFDAC_STARTUP_WEDGE_2026-10-10.md](docs/MEDPAI_NIGERIA_WHO_UN_NAFDAC_STARTUP_WEDGE_2026-10-10.md).

**Primary-source findings:** WHO traditional medicine strategy 2025–2034 (evidence/regulation/appropriate integration) and Medication Without Harm (transitions, polypharmacy, high risk). Nigerian Ministry of Health's traditional medicine implementation plan 2025–2029 and ethical standards. Nigeria Digital in Health Initiative NDHA official 48-page document proposes FHIR-based shared records, consent, drug registry with NAFDAC and integration of existing EHRs, not replacement. NAFDAC already has Greenbook, NAPAMS and a direct Med Safety adverse-event platform; its 2024 ADR guidelines expressly require asking about OTC and traditional medicines. PCN published electronic pharmacy rules 2026. UN/WHO/World Bank thematic alignment does **not** mean endorsement, tender access, grant or startup investment; the World Bank $1.57bn 2024 funding includes nonhealth SPIN. Local research shows medication reconciliation and herbal reporting/labeling gaps, subject to study scope and dates. Competitors include MedSafe drug information, Remedial Rx patient medication record, Helium EHR, DrugStoc supply, mPharma continuing care. Detailed links/research limits in memo.

**Strategic interpretation, NOT a finalized founder decision:** Reject unreviewed consumer herbal treatment/AI interaction clearance, national drug registry, EHR, pharmacy logistics and copycat ADR reporting as MVP. Test **ONE professional-led outpatient chronic-care medication history/reconciliation workflow**, combining prescriptions, actual-use reports and traditional/OTC products with source, changes, unknowns, flagged discrepancies and authorized professional review. Additional herbal adverse-report preparation could become a feature only if differentiated from NAFDAC's existing Med Safety. Treat the exact user (pharmacist vs clinician), care setting and paying institution as unsettled until field research. The repo's earlier medication-reality thesis remains a leading hypothesis, now sharpened by official NDHA and NAFDAC policy and confronted with existing PMR competitors.

**Decision status:** Research documented, hypothesis not yet accepted, no real patient-use clearance. Interview 12–15 practitioners; perform competitor workflow comparison and identify budgets; benchmark against ordinary medication-history form before costly buildout. Kill/re-design if no willing payer, unsafe false claims, duplication of existing PMR, or worse staff burden. Vet legal classification, NDPA/GAID and institution approvals before pilot; repo's unresolved Supabase mismatch/RLS risks make real patient uploads unacceptable. Detailed candidate test plan and constraints in cited memo.

**Read status:** The ministry's 2025–2029 traditional medicine implementation plan is linked via Google Drive but full text was not successfully accessed; do not invent its milestones. National HIE, FHIR guide and national drug registry are architectural projects: operational production availability and integration permissions unverified. Do not claim WHO/UN/NAFDAC partnership or regulatory registration.


## 2026-10-10 — Dataset-first product architecture and the $500m scale misunderstanding

**Founder asks:** Can existing datasets be used to build MedPAi, and does a World Bank $500m programme imply a similar startup needs vast funding? The answer: **yes to lawful reference datasets; no to equating national health-system financing with application-development cost**. Full source-by-source rights/safety/utility register and build gates: [docs/MEDPAI_OPEN_DATA_AND_SCALE_2026-10-10.md](docs/MEDPAI_OPEN_DATA_AND_SCALE_2026-10-10.md). This is research only; no data ingestion or runtime patient workflow modifications implemented.

**Financing facts (World Bank 26 Sept 2024):** $1.57bn across HOPE-GOV $500m health/education governance, HOPE-PHC $570m ($500m IDA credit + $70m GFF grant; services intended to reach ~40m people), and SPIN $500m dams/irrigation. National multisector service delivery, public systems, workforce, financing, procurement and implementation, not a price quote for a small digital health product. No MedPAi grant or eligibility implied. Source https://www.worldbank.org/en/news/press-release/2024/09/26/world-bank-approves-new-financing-for-nigeria-to-improve-health-outcomes-safety-of-dams-and-irrigation-services .

**Concrete dataset choices to evaluate (not yet ingested):** Nigeria 2024 Essential Medicines List published by WHO September 2026 (license/reuse review pending), official NAFDAC Greenbook and NAPAMS *lookup* (public search != bulk commercial API permission), US-oriented NLM RxNorm free core terminology/prescribable subset (full release UMLS/proprietary restrictions), NLM DailyMed US labelling, openFDA NDC (listing != FDA approval), openFDA FAERS (spontaneous reports != causality/safety/incidence), WHO GHO aggregated research (dataset-specific licensing), Nigeria Core FHIR draft specs (not verified live HIE/API). **RxNav's drug–drug interaction features were discontinued in January 2024**; do not design interaction engine expecting that API. WHO eEML site and individual publication licenses differ (some documents CC BY-NC-SA), so review exact source rights before commercial reuse. NAFDAC publishes Software as Medical Device registration guidance: intended-use classification needs specialist review. Academic PhysioNet MIMIC-IV requires credentialed access, DUA and is US-biased; Synthea fictional outputs are permitted at most in internal automated tests, never in MedPAi's actual records/UI.

**Product architecture direction (not final founder approval):** Reference medicines data vs real-world medication assertions vs human review events vs population indicators should be strictly separated. Existing datasets can support names, candidate normalizations, provenance and contextual research; no dataset proves a patient's actual medicines, interaction safety or herbal efficacy. Input must retain verbatim raw names, sources, current status unknowns, clinician validation and evidence dates. Test narrow outpatient reconciliation vs ordinary paper/digital history; avoid new nationwide registry, generalized clinical AI, herbal cure claims or unauthorized NAFDAC scraping. No invented project budget; test on free tools first but budget for security, data rights, healthcare partner workload and regulation before real clinical use.

**Next actions / kill criteria:** Founder selection of first licensed user/site and payer, data source legal-use audit, provenance-first schema, verification of Supabase project RLS/auth and patient data governance, then professional study with permissions. Kill if clinical risk, license incompatibility, no payer or the ordinary form works as well. Research is committed to the existing draft safety branch, not merged/deployed as clinical functionality.
