/**
 * Nonclinical referral transport telemetry.
 *
 * An HTTP or gateway receipt proves neither a clinician saw a referral nor
 * that the destination accepted a patient. This module stores no payload,
 * patient information, offline queue, credentials, or transport side effects.
 * Server-side authentication/idempotency and secure storage remain required.
 */
export type TransportAttemptOutcome =
  | "connection_unavailable"
  | "connection_timeout"
  | "gateway_rejected"
  | "gateway_accepted";

export interface ReferralTransportAttempt {
  referralRef: string;
  /** Stable per logical delivery intent, including retries. */
  idempotencyRef: string;
  destinationRef: string;
  attemptRef: string;
  /** Ordered sequence for diagnostics, not a clinical event order. */
  attemptNumber: number;
  attemptedAt: string;
  outcome: TransportAttemptOutcome;
  /** HTTP/gateway reference is NOT a care-provider acknowledgment. */
  gatewayReceiptRef: string | null;
}

export type TransportEvidenceState =
  | "no_transport_attempt"
  | "delivery_unconfirmed"
  | "gateway_accepted_only";

export interface ReferralTransportEvidence {
  state: TransportEvidenceState;
  attemptCount: number;
  gatewayReferencePresent: boolean;
  /** These fields NEVER become true from transport evidence. */
  receivingClinicianAcknowledged: false;
  patientAcceptedForCare: false;
  careCompleted: false;
  /** No implied clinical SLA, emergency priority or automated forwarding. */
  clinicalEscalationInferred: false;
}

function validOpaqueRef(value: unknown): value is string {
  return typeof value === "string" &&
    /^[A-Za-z0-9_-]{1,120}$/.test(value);
}

function validMoment(value: unknown): boolean {
  return typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

/**
 * Offline/HTTP retries can provide transport diagnostics but never evidence
 * that a receiving clinical team acknowledged, admitted or treated anyone.
 * Distinct destinations or idempotency keys require a new authorization flow.
 */
export function assessReferralTransport(
  attempts: readonly ReferralTransportAttempt[],
): ReferralTransportEvidence {
  if (!Array.isArray(attempts)) {
    throw new Error("Transport telemetry must be a list.");
  }
  if (attempts.length === 0) {
    return {
      state: "no_transport_attempt", attemptCount: 0,
      gatewayReferencePresent: false, receivingClinicianAcknowledged: false,
      patientAcceptedForCare: false, careCompleted: false,
      clinicalEscalationInferred: false,
    };
  }

  const first = attempts[0];
  const seenAttemptRefs = new Set<string>();
  let gatewayAccepted = false;
  let gatewayReferencePresent = false;

  for (const [index, attempt] of attempts.entries()) {
    if (!attempt || !validOpaqueRef(attempt.referralRef) ||
        !validOpaqueRef(attempt.destinationRef) ||
        !validOpaqueRef(attempt.idempotencyRef) ||
        !validOpaqueRef(attempt.attemptRef) ||
        !Number.isSafeInteger(attempt.attemptNumber) ||
        attempt.attemptNumber !== index + 1 ||
        !validMoment(attempt.attemptedAt) ||
        (attempt.outcome !== "connection_unavailable" &&
         attempt.outcome !== "connection_timeout" &&
         attempt.outcome !== "gateway_rejected" &&
         attempt.outcome !== "gateway_accepted") ||
        (attempt.gatewayReceiptRef !== null &&
         !validOpaqueRef(attempt.gatewayReceiptRef))) {
      throw new Error("Transport attempt lacks valid source, time, or sequence.");
    }
    if (attempt.referralRef !== first.referralRef ||
        attempt.destinationRef !== first.destinationRef ||
        attempt.idempotencyRef !== first.idempotencyRef) {
      throw new Error("Cannot change referral, destination or idempotency identity during retry.");
    }
    if (seenAttemptRefs.has(attempt.attemptRef)) {
      throw new Error("Duplicate attempt identifier; inspect retry and replay.");
    }
    seenAttemptRefs.add(attempt.attemptRef);
    if (attempt.outcome !== "gateway_accepted" &&
        attempt.gatewayReceiptRef !== null) {
      throw new Error("A failed or unconfirmed transport cannot claim a gateway receipt.");
    }
    if (attempt.outcome === "gateway_accepted") {
      // A bare "success" flag is unverified without its transport receipt.
      // Even a receipt proves only gateway transport, never clinical ACK.
      if (attempt.gatewayReceiptRef !== null) {
        gatewayAccepted = true;
        gatewayReferencePresent = true;
      }
    }
  }

  return {
    state: gatewayAccepted ? "gateway_accepted_only" : "delivery_unconfirmed",
    attemptCount: attempts.length,
    gatewayReferencePresent,
    receivingClinicianAcknowledged: false,
    patientAcceptedForCare: false,
    careCompleted: false,
    clinicalEscalationInferred: false,
  };
}
