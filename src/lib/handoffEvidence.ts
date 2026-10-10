/**
 * MedPAi non-emergency handoff evidence contract (v1).
 *
 * This pure module processes METADATA, not medical notes or patient identity.
 * It cannot triage, authorize clinicians, contact hospitals, persist PHI,
 * send referrals, declare clinical readiness, or override emergency processes.
 * A secure backend must authenticate organizations, people and event history.
 */
export const MANDATORY_HANDOFF_FIELDS = [
  "subject_linkage",
  "referring_contact",
  "intended_destination",
  "referral_reason",
  "clinical_decision_author",
] as const;

export const OPTIONAL_HANDOFF_FIELDS = [
  "medicine_use",
  "allergy_information",
  "observations",
  "relevant_history",
  "pending_questions",
  "care_actions_taken",
  "preferred_contact_channel",
] as const;

export type HandoffFieldKey =
  | (typeof MANDATORY_HANDOFF_FIELDS)[number]
  | (typeof OPTIONAL_HANDOFF_FIELDS)[number];

export type HandoffFieldState =
  | "present" | "explicitly_unknown" | "not_collected" | "withheld";

export type HandoffSourceType =
  | "person_report" | "caregiver_report" | "clinician_observation"
  | "existing_record" | "device_observation" | "unknown";

export interface HandoffEvidenceDescriptor {
  key: HandoffFieldKey;
  state: HandoffFieldState;
  /** Opaque reference, not a patient name, free-text note, or medical data. */
  provenanceRef: string | null;
  sourceType: HandoffSourceType;
  /** Source-observed time, NOT proof of clinical review or server receipt. */
  observedAt: string | null;
}

/**
 * A partner can change *additional* completeness prompts in a future revision.
 * The invariant minimum never comes from this profile and cannot be removed.
 * An "engineering" profile is NOT clinical protocol approval.
 */
export interface LocalHandoffProfile {
  profileId: string;
  revision: number;
  pathway: "non_emergency_outpatient_referral";
  additionalRequiredFields: HandoffFieldKey[];
  /** Research source ID; does not automatically validate a configuration. */
  evidenceReviewRef: string | null;
}

export type HandoffIssueKind =
  | "missing" | "unknown" | "withheld" | "unattributed"
  | "time_unverified";

export interface HandoffIssue {
  key: HandoffFieldKey;
  kind: HandoffIssueKind;
  required: boolean;
}

export interface HandoffEvidenceAssessment {
  appliedProfile: { profileId: string; revision: number };
  requiredFields: HandoffFieldKey[];
  issues: HandoffIssue[];
  /** Administrative evidence coverage, never permission to transmit or treat. */
  allRequiredEvidenceAttributed: boolean;
  disposition: "requires_authorized_clinical_review";
  /** Emergency care never waits for this assessment. */
  overridesUrgentCarePathway: false;
}

const fieldKeys = new Set<HandoffFieldKey>([
  ...MANDATORY_HANDOFF_FIELDS, ...OPTIONAL_HANDOFF_FIELDS,
]);
const mandatory = new Set<HandoffFieldKey>(MANDATORY_HANDOFF_FIELDS);
const sourceTypes = new Set<HandoffSourceType>([
  "person_report", "caregiver_report", "clinician_observation",
  "existing_record", "device_observation", "unknown",
]);
const states = new Set<HandoffFieldState>([
  "present", "explicitly_unknown", "not_collected", "withheld",
]);
function validTime(value: string | null): boolean {
  return typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function validateLocalHandoffProfile(profile: LocalHandoffProfile): void {
  if (!profile || !/^[a-z][a-z0-9_-]{2,79}$/.test(profile.profileId) ||
      !Number.isSafeInteger(profile.revision) || profile.revision < 1 ||
      profile.pathway !== "non_emergency_outpatient_referral" ||
      !Array.isArray(profile.additionalRequiredFields) ||
      (profile.evidenceReviewRef !== null &&
        (typeof profile.evidenceReviewRef !== "string" ||
         !/^[a-zA-Z0-9_-]{1,100}$/.test(profile.evidenceReviewRef)))) {
    throw new Error("Invalid versioned, non-emergency workflow profile.");
  }
  const seen = new Set<HandoffFieldKey>();
  for (const key of profile.additionalRequiredFields) {
    if (!fieldKeys.has(key) || mandatory.has(key) || seen.has(key)) {
      throw new Error("Profile cannot remove, duplicate, or invent mandatory handoff fields.");
    }
    seen.add(key);
  }
}

/**
 * Never upgrades untrusted source descriptors to clinical fact. A present item
 * without usable source/time metadata remains an unresolved information gap.
 * A profile can add required fields but cannot remove the permanent minimum.
 */
export function assessHandoffEvidence(
  profile: LocalHandoffProfile,
  evidence: readonly HandoffEvidenceDescriptor[],
): HandoffEvidenceAssessment {
  validateLocalHandoffProfile(profile);
  if (!Array.isArray(evidence)) throw new Error("Handoff evidence must be a list.");
  const provided = new Map<HandoffFieldKey, HandoffEvidenceDescriptor>();
  for (const item of evidence) {
    if (!item || !fieldKeys.has(item.key) || !states.has(item.state) ||
        !sourceTypes.has(item.sourceType) ||
        (item.provenanceRef !== null && typeof item.provenanceRef !== "string") ||
        (item.observedAt !== null && typeof item.observedAt !== "string")) {
      throw new Error("Unsupported or malformed evidence descriptor.");
    }
    if (provided.has(item.key)) {
      throw new Error("Conflicting duplicate field: explicit source reconciliation required.");
    }
    provided.set(item.key, item);
  }
  const requiredFields: HandoffFieldKey[] = [
    ...MANDATORY_HANDOFF_FIELDS, ...profile.additionalRequiredFields,
  ];
  const required = new Set(requiredFields);
  const issues: HandoffIssue[] = [];
  for (const key of fieldKeys) {
    const item = provided.get(key);
    if (!item) {
      if (required.has(key)) issues.push({ key, kind: "missing", required: true });
      continue;
    }
    if (item.state === "not_collected") {
      if (required.has(key)) issues.push({ key, kind: "missing", required: true });
      continue;
    }
    if (item.state === "explicitly_unknown") {
      issues.push({ key, kind: "unknown", required: required.has(key) });
      continue;
    }
    if (item.state === "withheld") {
      issues.push({ key, kind: "withheld", required: required.has(key) });
      continue;
    }
    if (item.sourceType === "unknown" || !item.provenanceRef?.trim()) {
      issues.push({ key, kind: "unattributed", required: required.has(key) });
    }
    if (!validTime(item.observedAt)) {
      issues.push({ key, kind: "time_unverified", required: required.has(key) });
    }
  }
  return {
    appliedProfile: { profileId: profile.profileId, revision: profile.revision },
    requiredFields,
    issues,
    allRequiredEvidenceAttributed: !issues.some(issue => issue.required),
    disposition: "requires_authorized_clinical_review",
    overridesUrgentCarePathway: false,
  };
}
