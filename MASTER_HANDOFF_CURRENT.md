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