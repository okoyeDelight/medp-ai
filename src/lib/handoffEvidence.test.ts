import { describe, expect, it } from "vitest";
import {
  assessHandoffEvidence, validateLocalHandoffProfile,
  MANDATORY_HANDOFF_FIELDS, type HandoffEvidenceDescriptor,
  type HandoffFieldKey, type LocalHandoffProfile,
} from "./handoffEvidence";

// Opaque test references only; no patient, medicine, or clinical data is stored.
const profile: LocalHandoffProfile = {
  profileId: "outpatient_alpha", revision: 1,
  pathway: "non_emergency_outpatient_referral",
  additionalRequiredFields: [], evidenceReviewRef: null,
};

function item(
  key: HandoffFieldKey,
  changes: Partial<HandoffEvidenceDescriptor> = {},
): HandoffEvidenceDescriptor {
  return {
    key, state: "present", provenanceRef: "test-source-1",
    sourceType: "existing_record", observedAt: "2026-10-10T09:00:00Z",
    ...changes,
  };
}

const minimum = () => MANDATORY_HANDOFF_FIELDS.map(key => item(key));

describe("fieldwork-adaptable handoff evidence without clinical authority", () => {
  it("starts empty with explicit missing fields, never a fabricated record", () => {
    const assessment = assessHandoffEvidence(profile, []);
    expect(assessment.issues).toHaveLength(MANDATORY_HANDOFF_FIELDS.length);
    expect(assessment.issues.every(issue => issue.kind === "missing")).toBe(true);
    expect(assessment.allRequiredEvidenceAttributed).toBe(false);
    expect(assessment.disposition).toBe("requires_authorized_clinical_review");
    expect(assessment.overridesUrgentCarePathway).toBe(false);
  });

  it("preserves a versioned configuration for a future local pilot", () => {
    const adapted: LocalHandoffProfile = {
      ...profile, revision: 2, additionalRequiredFields: ["medicine_use", "pending_questions"],
      evidenceReviewRef: "nonpatient-research-note",
    };
    const assessment = assessHandoffEvidence(adapted, minimum());
    expect(assessment.appliedProfile).toEqual({ profileId: "outpatient_alpha", revision: 2 });
    expect(assessment.requiredFields).toEqual([
      ...MANDATORY_HANDOFF_FIELDS, "medicine_use", "pending_questions",
    ]);
    expect(assessment.issues).toEqual([
      { key: "medicine_use", kind: "missing", required: true },
      { key: "pending_questions", kind: "missing", required: true },
    ]);
  });

  it("cannot lower mandatory evidence by submitting a different profile", () => {
    const adapted: LocalHandoffProfile = {
      ...profile, profileId: "different_site", additionalRequiredFields: ["observations"],
    };
    const assessment = assessHandoffEvidence(adapted, [item("observations")]);
    expect(assessment.requiredFields).toEqual([...MANDATORY_HANDOFF_FIELDS, "observations"]);
    expect(assessment.allRequiredEvidenceAttributed).toBe(false);
  });

  it("cannot insert automated triage or invented evidence categories via profile", () => {
    expect(() => validateLocalHandoffProfile({
      ...profile, additionalRequiredFields: ["automatic_triage" as HandoffFieldKey],
    })).toThrow(/Profile cannot/);
    expect(() => validateLocalHandoffProfile({
      ...profile, pathway: "emergency_dispatch" as LocalHandoffProfile["pathway"],
    })).toThrow(/non-emergency/);
  });

  it("rejects duplicate mandatory fields and repeated local requirements", () => {
    expect(() => validateLocalHandoffProfile({
      ...profile, additionalRequiredFields: ["referral_reason"],
    })).toThrow(/Profile cannot/);
    expect(() => validateLocalHandoffProfile({
      ...profile, additionalRequiredFields: ["observations", "observations"],
    })).toThrow(/Profile cannot/);
  });

  it("rejects invalid profile revisions and unsourced configuration references", () => {
    expect(() => validateLocalHandoffProfile({ ...profile, revision: 0 })).toThrow();
    expect(() => validateLocalHandoffProfile({
      ...profile, evidenceReviewRef: "A named patient: 123",
    })).toThrow();
  });

  it("does not let 'explicitly unknown' pass as completed information", () => {
    const evidence = minimum().map(entry =>
      entry.key === "referral_reason" ? { ...entry, state: "explicitly_unknown" as const } : entry,
    );
    const result = assessHandoffEvidence(profile, evidence);
    expect(result.issues).toContainEqual({
      key: "referral_reason", kind: "unknown", required: true,
    });
    expect(result.allRequiredEvidenceAttributed).toBe(false);
  });

  it("keeps withheld and not-collected evidence distinct", () => {
    const evidence = [
      ...minimum().filter(item => !["referral_reason", "subject_linkage"].includes(item.key)),
      item("referral_reason", { state: "withheld" }),
      item("subject_linkage", { state: "not_collected" }),
    ];
    const result = assessHandoffEvidence(profile, evidence);
    expect(result.issues).toContainEqual({
      key: "referral_reason", kind: "withheld", required: true,
    });
    expect(result.issues).toContainEqual({
      key: "subject_linkage", kind: "missing", required: true,
    });
  });

  it("does not silently promote a missing source or missing timestamp", () => {
    const evidence = minimum().map(entry => entry.key === "referral_reason"
      ? item(entry.key, { provenanceRef: null, observedAt: null, sourceType: "unknown" })
      : entry);
    const result = assessHandoffEvidence(profile, evidence);
    expect(result.issues).toContainEqual({
      key: "referral_reason", kind: "unattributed", required: true,
    });
    expect(result.issues).toContainEqual({
      key: "referral_reason", kind: "time_unverified", required: true,
    });
    expect(result.allRequiredEvidenceAttributed).toBe(false);
  });

  it("requires real timezone-bearing source times, not vague device time", () => {
    const result = assessHandoffEvidence(profile, [
      ...minimum().filter(entry => entry.key !== "referral_reason"),
      item("referral_reason", { observedAt: "2026-10-10 09:00" }),
    ]);
    expect(result.issues).toContainEqual({
      key: "referral_reason", kind: "time_unverified", required: true,
    });
  });

  it("refuses duplicate/conflicting reports instead of taking the last record", () => {
    expect(() => assessHandoffEvidence(profile, [
      ...minimum(), item("referral_reason", { provenanceRef: "other-test-source" }),
    ])).toThrow(/duplicate/);
  });

  it("a structurally complete packet still cannot imply clinical safety", () => {
    const assessment = assessHandoffEvidence(profile, minimum());
    expect(assessment.issues).toHaveLength(0);
    expect(assessment.allRequiredEvidenceAttributed).toBe(true);
    expect(assessment.disposition).toBe("requires_authorized_clinical_review");
    expect(assessment.overridesUrgentCarePathway).toBe(false);
    expect(JSON.stringify(assessment)).not.toMatch(/diagnos|safe to treat|approved/i);
  });

  it("optional unknown product use remains visible without fabricating an item", () => {
    const assessment = assessHandoffEvidence(profile, [
      ...minimum(),
      item("medicine_use", { state: "explicitly_unknown", provenanceRef: null }),
    ]);
    expect(assessment.issues).toContainEqual({
      key: "medicine_use", kind: "unknown", required: false,
    });
    expect(assessment.allRequiredEvidenceAttributed).toBe(true);
  });

  it("rejects unknown fields and invalid evidence states at runtime", () => {
    expect(() => assessHandoffEvidence(profile, [
      item("a-diagnosis" as HandoffFieldKey),
    ])).toThrow(/Unsupported/);
    expect(() => assessHandoffEvidence(profile, [
      item("referral_reason", { state: "clinically_safe" as HandoffEvidenceDescriptor["state"] }),
    ])).toThrow(/Unsupported/);
  });
});
