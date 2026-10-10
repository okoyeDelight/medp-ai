import { describe, expect, it } from "vitest";
import {
  buildReviewQueue, summarizeSourceKinds,
  type AssertionReview, type EvidenceSource,
  type MedicationAssertion, type MedicationIdentityReview,
  type VerifyMedicationReviewer,
} from "./medicationEvidence";

// Isolated test fixtures, NEVER displayed as real records in the product.
const sources: EvidenceSource[] = [
  { id: "source-report", kind: "patient_report", capturedAt: "2026-10-10T09:00:00Z", sourceReference: null },
  { id: "source-rx", kind: "prescription", capturedAt: "2026-10-10T09:01:00Z", sourceReference: "test-only" },
];
const assertion = (overrides: Partial<MedicationAssertion> = {}): MedicationAssertion => ({
  id: "assert-1", subjectRef: "TEST-ONLY-SUBJECT", rawMedicineName: "Test product",
  evidenceSourceId: "source-report", reportedState: "reports_taking",
  timeframe: "current", recordedAt: "2026-10-10T09:00:00Z",
  sourceObservedAt: null, rawStatement: null, ...overrides,
});
const humanReviewAllowed: VerifyMedicationReviewer = (review) =>
  ("verifierRef" in review ? review.verifierRef : review.reviewerRef) === "test-reviewer";
const humanLink: MedicationIdentityReview = {
  id: "test-link", assertionIds: ["assert-1", "assert-2"],
  reviewedIdentityKey: "reviewed-product-identifier", verifierRef: "test-reviewer",
  reviewedAt: "2026-10-10T09:05:00Z", decision: "same_product_identity",
};

describe("evidence-first medication reconciliation", () => {
  it("never infers patient use from a prescription", () => {
    const queue = buildReviewQueue([
      assertion({ reportedState: "prescribed", evidenceSourceId: "source-rx" }),
    ], sources);
    expect(queue.map(item => item.kind)).toEqual(["unverified_assertion"]);
  });

  it("preserves unknown use rather than replacing it with a guess", () => {
    const queue = buildReviewQueue([assertion({
      reportedState: "unknown", timeframe: "unknown",
    })], sources);
    expect(queue.map(item => item.kind)).toEqual([
      "unverified_assertion", "unknown_current_use",
    ]);
  });

  it("cannot infer identity or conflict just because names match", () => {
    const claims = [
      assertion(),
      assertion({ id: "assert-2", reportedState: "reports_not_taking" }),
    ];
    expect(buildReviewQueue(claims, sources)
      .some(item => item.kind === "different_source_statements")).toBe(false);
  });

  it("flags differing human-linked reports only for professional review", () => {
    const claims = [assertion(), assertion({
      id: "assert-2", reportedState: "reports_not_taking",
    })];
    const queue = buildReviewQueue(claims, sources, [humanLink], [], humanReviewAllowed);
    expect(queue.filter(item => item.kind === "different_source_statements")).toEqual([{
      kind: "different_source_statements",
      assertionIds: ["assert-1", "assert-2"],
      explanation: expect.stringContaining("professional"),
    }]);
    expect(JSON.stringify(queue)).not.toMatch(/safe to take|interaction approved/i);
  });

  it("never calls a prescription-versus-reported-use discrepancy an inherent contradiction", () => {
    const queue = buildReviewQueue([
      assertion({ reportedState: "prescribed", evidenceSourceId: "source-rx" }),
      assertion({ id: "assert-2", reportedState: "reports_not_taking" }),
    ], sources, [humanLink], [], humanReviewAllowed);
    expect(queue.some(item => item.kind === "different_source_statements")).toBe(false);
  });

  it("does not compare claims across people or past/current time", () => {
    const other = assertion({
      id: "assert-2", subjectRef: "DIFFERENT-TEST-SUBJECT",
      reportedState: "reports_stopped",
    });
    expect(buildReviewQueue([assertion(), other], sources, [humanLink], [], humanReviewAllowed)
      .some(item => item.kind === "different_source_statements")).toBe(false);
    expect(buildReviewQueue([
      assertion(), { ...other, subjectRef: "TEST-ONLY-SUBJECT", timeframe: "historical" },
    ], sources, [humanLink], [], humanReviewAllowed)
      .some(item => item.kind === "different_source_statements")).toBe(false);
  });

  it("does not accept rejected or unattributed identity matches", () => {
    const claims = [assertion(), assertion({
      id: "assert-2", reportedState: "reports_not_taking",
    })];
    const rejected: MedicationIdentityReview[] = [
      { ...humanLink, decision: "different_product_identity" },
      { ...humanLink, verifierRef: "" },
      { ...humanLink, reviewedIdentityKey: "" },
    ];
    for (const link of rejected) expect(buildReviewQueue(claims, sources, [link], [], humanReviewAllowed)
      .some(item => item.kind === "different_source_statements")).toBe(false);
  });

  it("flags missing source records rather than treating them as trusted", () => {
    expect(buildReviewQueue([assertion({ evidenceSourceId: "missing" })], sources)
      .map(item => item.kind)).toEqual(["missing_source"]);
  });

  it("a corroborated source with unknown use still has unknown use", () => {
    const review: AssertionReview = {
      id: "test-review", assertionId: "assert-1", reviewerRef: "test-reviewer",
      reviewedAt: "2026-10-10T09:05:00Z", decision: "corroborated", reason: "test",
    };
    expect(buildReviewQueue([assertion({ reportedState: "unknown" })], sources, [], [review], humanReviewAllowed)
      .map(item => item.kind)).toEqual(["unknown_current_use"]);
  });

  it("rejects forged reviewer strings by default instead of trusting an in-memory link", () => {
    const claims = [assertion(), assertion({
      id: "assert-2", reportedState: "reports_not_taking",
    })];
    const queue = buildReviewQueue(claims, sources, [humanLink]);
    expect(queue.some(item => item.kind === "different_source_statements")).toBe(false);
    const spoofed = buildReviewQueue(claims, sources, [
      { ...humanLink, verifierRef: "forged-provider" },
    ], [], humanReviewAllowed);
    expect(spoofed.some(item => item.kind === "different_source_statements")).toBe(false);
  });

  it("rejects reviewer metadata alone as source corroboration", () => {
    const review: AssertionReview = {
      id: "test-forged", assertionId: "assert-1", reviewerRef: "untrusted-provider",
      reviewedAt: "2026-10-10T09:05:00Z", decision: "corroborated", reason: "test",
    };
    expect(buildReviewQueue([assertion()], sources, [], [review])
      .some(item => item.kind === "unverified_assertion")).toBe(true);
    expect(buildReviewQueue([assertion()], sources, [], [review], humanReviewAllowed)
      .some(item => item.kind === "unverified_assertion")).toBe(true);
  });

  it("rejects duplicate source IDs and duplicate assertions rather than overwriting", () => {
    expect(() => buildReviewQueue([assertion()], [...sources, sources[0]]))
      .toThrow(/Duplicate/);
    expect(() => buildReviewQueue([assertion(), assertion()], sources))
      .toThrow(/Duplicate/);
  });

  it("cannot create a product identity by linking different people", () => {
    const queue = buildReviewQueue([
      assertion(), assertion({
        id: "assert-2", subjectRef: "SECOND-TEST-SUBJECT",
        reportedState: "reports_not_taking",
      }),
    ], sources, [humanLink], [], humanReviewAllowed);
    expect(queue.some(item => item.kind === "different_source_statements")).toBe(false);
  });

  it("reports provenance counts rather than counts of confirmed medicines", () => {
    expect(summarizeSourceKinds([
      assertion(),
      assertion({ id: "assert-2", evidenceSourceId: "source-rx", reportedState: "prescribed" }),
    ], sources)).toMatchObject({
      patient_report: 1, prescription: 1, dispensing_record: 0,
    });
  });

  it("does not raise an issue when identical current-use reports agree", () => {
    const items = [assertion(), assertion({ id: "assert-2" })];
    expect(buildReviewQueue(items, sources, [humanLink])
      .some(item => item.kind === "different_source_statements")).toBe(false);
  });
});
