# Open-Source and Security Readiness Checklist

**Status: in progress — not a security certification, clinical validation, or claim of production readiness.**

This checklist records repository hygiene and review work for maintainers. Items marked pending require human review, testing, or decisions that cannot responsibly be inferred from source code alone.

## Repository hygiene

- [x] Replace the placeholder README with project scope, setup instructions, limitations, and roadmap.
- [x] Ignore local `.env` files and provide a non-secret `.env.example`.
- [x] Remove the root `.env` from the current `main` branch.
- [x] Add contribution guidance, a security reporting policy, pull-request checklist, and issue templates.
- [x] Add GitHub Actions CI for lint, tests, and production build.
- [x] Enable scheduled dependency update pull requests through Dependabot.
- [x] Remove unsupported claims of end-to-end encryption, completed security audits, guaranteed cross-border compliance, and emergency monitoring from the privacy-policy copy.
- [ ] Confirm CI succeeds on GitHub Actions; adding a workflow is not evidence that the current build or tests pass.
- [ ] Review Git history and deployment logs for credentials. Rotate any real secret that was ever committed; deleting a file does not remove earlier history.
- [ ] Enable GitHub private vulnerability reporting in repository settings if available, and verify the maintainer can receive reports.
- [ ] Decide on and add a licence only after confirming the founder's intended reuse and distribution terms.

## Important licence conflict — decision required

The repository currently has no explicit open-source licence. The in-app Terms of Service also describe the app/source code as proprietary and restrict use to personal, non-commercial purposes without written consent. Those terms are not consistent with granting the broad reuse, modification, and redistribution rights normally expected of an open-source project.

**Do not label this repository as open source or add an arbitrary licence just to satisfy an application.** The maintainer must choose the intended model, review the Terms of Service and ownership of included assets/data, and make the repository licence and user-facing terms consistent. A qualified adviser can help with the legal implications. Until that decision is made, the code should not be assumed to be licensed for reuse.

## Security and privacy review — pending verification

- [ ] Review every Supabase table, view, storage bucket, RPC, and Edge Function for row-level security (RLS), least-privilege grants, and correct user/role scoping.
- [ ] Test authorization with at least two different test accounts and different roles. Confirm one patient cannot read or change another patient's records and that a client-supplied user ID cannot override the authenticated identity.
- [ ] Review privileged database functions for safe `search_path`, appropriate execution grants, and authorization checks.
- [ ] Review account recovery, email verification, session persistence, OAuth redirects, role assignment, provider credential verification, and account deletion.
- [ ] Review local/session storage usage to ensure it does not retain unnecessary health information or credentials.
- [ ] Review CORS, rate limits, input validation, error responses, logging, and abuse controls for every Edge Function.
- [ ] Review deployment environment variables and hosting settings; do not commit service-role keys or other server secrets.
- [ ] Review third-party SDKs, privacy disclosures, retention/deletion behavior, backup access, and cross-border processing before collecting real user data.
- [ ] Decide how security advisories and incidents will be triaged and communicated.

## Clinical safety and evidence — pending expert review

MedPAI includes health-related screens and herbal/medicine safety content. A polished interface or a passing software test does not prove that a clinical claim is true or safe.

- [ ] Trace every herbal, drug-interaction, plant-identification, triage, and dosage-related claim to reliable, relevant evidence.
- [ ] Record source, publication date, jurisdiction, evidence strength, reviewer, review date, and known uncertainty for safety-critical content.
- [ ] Have appropriately qualified pharmacists/clinicians review safety-critical rules before any real-world use.
- [ ] Distinguish verified facts, hypotheses, unreviewed data, and AI-generated text in the product.
- [ ] Test urgent-symptom flows and ensure the app never implies that it is monitoring emergencies or replaces professional care.
- [ ] Validate localization, health literacy, accessibility, and assumptions in the intended Nigerian context.
- [ ] Do not collect real patient data in development or use the app to make real clinical decisions before appropriate validation and approvals.

## Engineering quality — pending verification

- [ ] Confirm a clean install works from the documented instructions.
- [ ] Confirm lint, unit tests, and production build pass in CI.
- [ ] Add tests for authentication/authorization, critical data access, input validation, and safety-critical UI behavior.
- [ ] Review dependency alerts and update vulnerable packages with regression tests.
- [ ] Establish a documented release process, changelog, supported Node.js version, and rollback process.
- [ ] Add reproducible demo data that contains no real patient information.
- [ ] Review accessibility, mobile layouts, loading/error/empty states, and offline/PWA behavior.
- [ ] Verify all links and setup instructions from a fresh environment.

## Programme application integrity

For any open-source support application, describe the project accurately as early-stage while it is still being validated. Do not claim adoption, production usage, clinical validation, a security audit, passing CI, or an open-source licence until each is demonstrably true. Meaningful public development, clear licensing, maintainable tests, documented limitations, and transparent issue tracking are stronger signals than inflated claims.

## Last reviewed

2026-10-08. This date records when the checklist was written, not when all checks were completed.
