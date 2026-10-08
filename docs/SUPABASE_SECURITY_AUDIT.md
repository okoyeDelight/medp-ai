# Supabase Security Audit — MedPAI

**Review date:** 2026-10-08  
**Scope:** Read-only review of the connected Supabase project metadata, available Edge Function source, repository Supabase configuration, and repository layout.  
**Status:** Partial audit only. The database is currently reported as **INACTIVE**, database queries and migration listing timed out, and therefore live table grants, row-level security (RLS), storage policies, and migration state could not be verified. This is not a security certification.

## Findings

### High — Public signup function bypasses email verification

The connected Supabase project exposes an active Edge Function named `auth-signup` with `verify_jwt = false`. Its source uses the service-role key to call `auth.admin.createUser()` and sets `email_confirm: true` for the submitted email address. The endpoint accepts unauthenticated POST requests.

**Why this matters:** Anyone who can call the endpoint can attempt to create accounts for arbitrary email addresses without proving control of those addresses. This can enable account impersonation and unwanted account creation. The function also returns caught error messages directly to callers and has permissive wildcard CORS.

**Recommended remediation before production:**
1. Replace administrative account creation with the normal public Supabase Auth sign-up flow, which follows the project's configured email-confirmation policy.
2. Do not mark an email as confirmed unless a trusted verification flow has verified ownership.
3. Add abuse protection/rate limiting and sensible request-size/input limits.
4. Return generic client errors; log detailed errors server-side without secrets or personal health data.
5. Restrict CORS to the actual deployed application origins where practical.
6. Test sign-up, confirmation, duplicate accounts, and abuse limits before deployment.

**Important:** The live project is currently inactive and the repository's `supabase/functions` listing did not show an `auth-signup` source directory. Do not assume the repository and deployed function are in sync. This finding is about the function returned by the connected Supabase project; it has not been changed or redeployed.

### High — Signup endpoint remediation is now source-controlled, but not deployed

Added `supabase/functions/auth-signup/index.ts` to the repository. It uses the public anon key and Supabase's normal `auth.signUp()` flow instead of the service-role admin API, does not force email confirmation, validates input, avoids returning raw provider errors, and uses an explicit `ALLOWED_ORIGINS` allowlist.

**Deployment requirements:** Configure `ALLOWED_ORIGINS` with the exact production web origin(s) before deploying. This function deliberately rejects requests without an allowlisted browser Origin; confirm that this fits all supported clients. Add platform-level abuse/rate limiting and test signup/confirmation flows. This source change does **not** update the active Supabase deployment; the connected project is inactive, and no deployment was attempted.

### Medium — Edge Functions use wildcard CORS and need endpoint-by-endpoint review

A source scan found wildcard CORS in multiple repository functions, including `consultation-pin`, `nafdac-lookup`, `ai-remedy`, `drug-interactions`, `identify-plant`, and `safety-score`. Wildcard CORS is not by itself an authorization bypass, but for authenticated or sensitive operations it broadens which browser origins can make requests and increases the importance of strict JWT validation, server-side authorization, rate limiting, and avoiding cross-origin exposure.

**Recommended remediation:** For each function, document whether it is public or authenticated; enforce method and content-type checks; validate JWTs and user identity server-side; restrict CORS to known app origins where appropriate; cap body and array sizes; apply abuse controls; and return generic errors while keeping diagnostic details in protected logs. Do not treat CORS as a replacement for authorization.

### Medium — Consultation endpoint returns database error messages to clients

The repository's `consultation-pin` function returns some database/RPC `error.message` values directly. These may reveal internal schema, policy, or operational details. Replace these responses with stable generic error codes and log sanitized diagnostics server-side. Also verify that heartbeat/termination RPCs independently enforce session ownership and allowed state transitions.

### High — Live database access controls remain unverified

The connected project's status is `INACTIVE`. Attempts to list tables and migrations timed out. The security advisor returned no lint findings, but that empty response does **not** prove the database is secure, especially when the database could not be queried.

Before production, verify:
- RLS is enabled on every table exposed through the Data API.
- Policies enforce ownership and workspace membership, not merely `TO authenticated`.
- UPDATE policies include both `USING` and `WITH CHECK`.
- Views do not unintentionally bypass RLS.
- RPCs and `SECURITY DEFINER` functions have narrow execute grants and explicit authorization checks.
- Storage buckets and object policies prevent cross-user access.
- Patient, practitioner, workspace, consultation, and research records cannot be accessed across tenants.
- No service-role key or other server secret is bundled into browser code.

### Medium — Repository Supabase project reference differs from connected project

The repository's `supabase/config.toml` specifies project reference `lfpwbzyxtasanttxfbwi`, while the connected Supabase project returned reference `bbqhlcpvzkjvvdfclztl`. This may be intentional (for example, different environments), but it must be reconciled before anyone applies migrations or deploys functions. Do not blindly change the reference or deploy to either project until the owner confirms which project is the intended development/staging/production target.

### Medium — Function inventory differs between repository and connected project

The connected project lists active functions including `auth-signup` and several research functions, while the repository function folders show a different inventory. Treat the Git repository as not necessarily representing the live deployment. Establish a source-of-truth process and keep function source/version history synchronized.

### High — Consultation-session policies allow overly broad field updates

A repository migration creates patient-facing INSERT and UPDATE policies on `public.consultation_sessions` that check only that `patient_id` remains the authenticated user's ID. The provider UPDATE policy checks that the caller is an active provider for the session's hospital, but it does not constrain which columns the provider may change.

**Why this matters:** A patient can submit or edit session fields such as `provider_id`, `claimed_at`, `revoked_at`, and `ends_at` rather than being limited to creating/revoking a pending session. A provider who can update a session may also be able to alter fields outside the intended claim operation, including patient/session ownership fields. Since these sessions gate provider reads of clinical records, the database should enforce a strict state transition instead of trusting the client.

**Recommended remediation:** Replace broad session updates with narrowly scoped database operations/RPCs or Edge Functions that derive the patient/provider identity from the authenticated user, validate the session state and hospital membership, enforce expiry and revocation, and prevent changing immutable ownership fields. If direct updates remain, use column-level grants and carefully designed policies; RLS alone does not restrict which columns a row update can modify. Add tests for forged session creation, patient/provider reassignment, revoked sessions, expired sessions, and cross-hospital access.

This is a **migration-source finding**, not a confirmed live exploit: live database policy state could not be queried while the project was inactive.

### Medium — SECURITY DEFINER helper functions need explicit execute grants

The repository migration defines several `SECURITY DEFINER` functions in the exposed `public` schema, including `has_role`, `is_hospital_admin`, `is_verified_provider`, `provider_hospital_id`, and `has_active_consultation`. PostgreSQL normally grants function execution to `PUBLIC` unless privileges are changed.

**Recommended remediation:** Revoke default `EXECUTE` from `PUBLIC` and grant only to the required roles; where appropriate, validate `auth.uid()` inside the function and avoid accepting arbitrary user IDs from clients. Keep a fixed safe `search_path`, review each function's data exposure, and verify grants against the live database before deploying changes.

## Required next steps

1. Confirm which Supabase project reference is intended for MedPAI and restore/activate it if appropriate.
2. Fix the unauthenticated admin-signup behavior in the actual function source, then deploy only to the confirmed target project.
3. Re-run live database inspection: table inventory, RLS policies, grants, views, functions/RPCs, and storage policies.
4. Run Supabase security advisors again after database access is restored and remediate every relevant finding.
5. Add integration tests proving one user cannot read, edit, or delete another user's patient or workspace records.
6. Do not use real patient data until security, privacy, and clinical governance reviews are complete.

## What this audit does not establish

This review does not establish that MedPAI is secure, compliant with NDPR or other law, clinically validated, NAFDAC-approved, or ready for production. It does not prove whether any data has been exposed. The inactive database and mismatched project reference prevented a complete live review.
