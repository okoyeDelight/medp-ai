/**
 * Information boundary for MedPAi. An assertion records what ONE source says,
 * not medically verified fact. No diagnosis, medicine recommendation,
 * interaction checking, automatic identity matching, or user authorization.
 * Real patient claims require a separately verified secure backend.
 */

export type EvidenceSourceKind =
  | "patient_report" | "caregiver_report" | "prescription"
  | "dispensing_record" | "packaging" | "clinician_note" | "other";

export interface EvidenceSource {
  id: string;
  kind: EvidenceSourceKind;
  /** ISO 8601 with timezone when the source was captured. */
  capturedAt: string;
  /** May be null for verbal reports. Never embed private data here. */
  sourceReference: string | null;
}

export type ReportedMedicationState =
  | "prescribed" | "dispensed" | "reports_taking"
  | "reports_not_taking" | "reports_stopped" | "unknown";

export type RelativeTime = "current" | "historical" | "unknown";

export interface MedicationAssertion {
  id: string;
  /** Pseudonymous subject reference, not a name or public identifier. */
  subjectRef: string;
  /** Retains exactly what was written or spoken at capture. */
  rawMedicineName: string;
  evidenceSourceId: string;
  /** A statement, never a proven account of consumption. */
  reportedState: ReportedMedicationState;
  timeframe: RelativeTime;
  recordedAt: string;
  sourceObservedAt: string | null;
  rawStatement: string | null;
}

export interface MedicationIdentityReview {
  id: string;
  assertionIds: string[];
  /** Only populated following an explicit authorized human review. */
  reviewedIdentityKey: string;
  /** An opaque verifier reference; must be authenticated by server. */
  verifierRef: string;
  reviewedAt: string;
  decision: "same_product_identity" | "different_product_identity" | "insufficient_evidence";
}

export interface AssertionReview {
  id: string;
  assertionId: string;
  reviewerRef: string;
  reviewedAt: string;
  decision: "corroborated" | "disputed" | "needs_more_information";
  reason: string;
}

export type ReviewQueueItemKind =
  | "unverified_assertion"
  | "unknown_current_use"
  | "different_source_statements"
  | "missing_source";

export interface ReviewQueueItem {
  kind: ReviewQueueItemKind;
  assertionIds: string[];
  /** Administrative clarification, NOT a clinical risk verdict. */
  explanation: string;
}

const CURRENT_USE_STATES: ReadonlySet<ReportedMedicationState> = new Set([
  "reports_taking", "reports_not_taking", "reports_stopped",
]);

function pairKey(ids: string[]) {
  return [...ids].sort().join("\u0000");
}

/**
 * A deterministic review queue for one person's medication assertions.
 * Never infer medicine identity from name similarity, use from prescriptions,
 * or clinical safety from status differences. Grouping requires a HUMAN
 * identity-review event whose authorization is enforced by a server.
 */
export function buildReviewQueue(
  assertions: readonly MedicationAssertion[],
  sources: readonly EvidenceSource[],
  identityReviews: readonly MedicationIdentityReview[] = [],
  assertionReviews: readonly AssertionReview[] = [],
): ReviewQueueItem[] {
  const queue: ReviewQueueItem[] = [];
  const sourceIds = new Set(sources.map(source => source.id));
  const latestDecisions = new Map<string, AssertionReview>();
  for (const review of assertionReviews) {
    const old = latestDecisions.get(review.assertionId);
    if (!old || review.reviewedAt > old.reviewedAt) {
      latestDecisions.set(review.assertionId, review);
    }
  }
  for (const assertion of assertions) {
    if (!sourceIds.has(assertion.evidenceSourceId)) {
      queue.push({
        kind: "missing_source", assertionIds: [assertion.id],
        explanation: "The reported information is missing its source reference.",
      });
      continue;
    }
    if (latestDecisions.get(assertion.id)?.decision !== "corroborated") {
      queue.push({
        kind: "unverified_assertion", assertionIds: [assertion.id],
        explanation: "This source's statement has not been corroborated by a reviewer.",
      });
    }
    if (assertion.reportedState === "unknown" || assertion.timeframe === "unknown") {
      queue.push({
        kind: "unknown_current_use", assertionIds: [assertion.id],
        explanation: "The actual or current use of this reported item is not established.",
      });
    }
  }

  const assertionsById = new Map(assertions.map(assertion => [assertion.id, assertion]));
  const seen = new Set<string>();
  for (const identity of identityReviews) {
    if (
      identity.decision !== "same_product_identity" ||
      !identity.verifierRef.trim() || !identity.reviewedIdentityKey.trim() ||
      identity.assertionIds.length < 2
    ) continue;
    const group = identity.assertionIds
      .map(id => assertionsById.get(id))
      .filter((item): item is MedicationAssertion => item !== undefined)
      .filter(item => sourceIds.has(item.evidenceSourceId) && item.timeframe === "current");
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const left = group[i], right = group[j];
        if (left.id === right.id || left.subjectRef !== right.subjectRef) continue;
        const leftState = left.reportedState, rightState = right.reportedState;
        // A prescription versus reported use is a different evidence type,
        // not an inherent contradiction and never adherence proof.
        if (!CURRENT_USE_STATES.has(leftState) || !CURRENT_USE_STATES.has(rightState)) continue;
        if (leftState === rightState) continue;
        const key = pairKey([left.id, right.id]);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({
          kind: "different_source_statements",
          assertionIds: [left.id, right.id].sort(),
          explanation: "Two reports about a human-linked medicine differ. A professional must establish the timeline and meaning.",
        });
      }
    }
  }
  return queue;
}

/** Count source assertions, not independently validated medication use. */
export function summarizeSourceKinds(
  assertions: readonly MedicationAssertion[],
  sources: readonly EvidenceSource[],
): Record<EvidenceSourceKind, number> {
  const kinds = new Map(sources.map(source => [source.id, source.kind]));
  const counts: Record<EvidenceSourceKind, number> = {
    patient_report: 0, caregiver_report: 0, prescription: 0,
    dispensing_record: 0, packaging: 0, clinician_note: 0, other: 0,
  };
  for (const assertion of assertions) {
    const kind = kinds.get(assertion.evidenceSourceId);
    if (kind) counts[kind]++;
  }
  return counts;
}
