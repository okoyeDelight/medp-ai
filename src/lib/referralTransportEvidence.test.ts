import { describe, expect, it } from "vitest";
import { assessReferralTransport, type ReferralTransportAttempt } from "./referralTransportEvidence";

// Test-only opaque transport metadata. No actual health records or personal data.
function attempt(
  number: number,
  outcome: ReferralTransportAttempt["outcome"],
  changes: Partial<ReferralTransportAttempt> = {},
): ReferralTransportAttempt {
  return {
    referralRef: "test-referral", destinationRef: "test-destination",
    idempotencyRef: "test-intent", attemptRef: "attempt-" + number,
    attemptNumber: number, attemptedAt: "2026-10-10T09:00:00Z",
    outcome, gatewayReceiptRef: outcome === "gateway_accepted" ? "gateway-202" : null,
    ...changes,
  };
}

describe("transport evidence cannot certify clinical handoff completion", () => {
  it("reports no delivery proof before an actual transport attempt", () => {
    expect(assessReferralTransport([])).toEqual({
      state: "no_transport_attempt", attemptCount: 0,
      gatewayReferencePresent: false,
      receivingClinicianAcknowledged: false,
      patientAcceptedForCare: false, careCompleted: false,
      clinicalEscalationInferred: false,
    });
  });

  it("does not make a connectivity timeout into a completed referral", () => {
    const progress = assessReferralTransport([
      attempt(1, "connection_unavailable"),
      attempt(2, "connection_timeout"),
    ]);
    expect(progress).toMatchObject({
      state: "delivery_unconfirmed", attemptCount: 2,
      receivingClinicianAcknowledged: false,
      patientAcceptedForCare: false, careCompleted: false,
    });
  });

  it("refuses to equate HTTP 202 with a receiving provider acknowledgment", () => {
    expect(assessReferralTransport([attempt(1, "gateway_accepted")])).toMatchObject({
      state: "gateway_accepted_only", gatewayReferencePresent: true,
      receivingClinicianAcknowledged: false, patientAcceptedForCare: false,
      careCompleted: false, clinicalEscalationInferred: false,
    });
  });

  it("does not turn a gateway success without a reference into professional proof", () => {
    const result = assessReferralTransport([
      attempt(1, "gateway_accepted", { gatewayReceiptRef: null }),
    ]);
    expect(result.state).toBe("delivery_unconfirmed");
    expect(result.gatewayReferencePresent).toBe(false);
    expect(result.receivingClinicianAcknowledged).toBe(false);
  });

  it("keeps uncertain retry outcomes uncertain", () => {
    const result = assessReferralTransport([
      attempt(1, "connection_timeout"),
      attempt(2, "gateway_rejected"),
    ]);
    expect(result.state).toBe("delivery_unconfirmed");
  });

  it("keeps a prior transport response distinct from clinical acknowledgment", () => {
    const result = assessReferralTransport([
      attempt(1, "gateway_accepted"),
      attempt(2, "connection_timeout"),
    ]);
    expect(result.state).toBe("gateway_accepted_only");
    expect(result.receivingClinicianAcknowledged).toBe(false);
  });

  it("rejects switching destination or referral identity during a retry", () => {
    expect(() => assessReferralTransport([
      attempt(1, "connection_timeout"),
      attempt(2, "gateway_accepted", { destinationRef: "second-clinic" }),
    ])).toThrow(/Cannot change/);
    expect(() => assessReferralTransport([
      attempt(1, "connection_timeout"),
      attempt(2, "gateway_accepted", { referralRef: "other-case" }),
    ])).toThrow(/Cannot change/);
  });

  it("refuses changing idempotency key during retry", () => {
    expect(() => assessReferralTransport([
      attempt(1, "connection_timeout"),
      attempt(2, "gateway_accepted", { idempotencyRef: "new-intent" }),
    ])).toThrow(/idempotency/);
  });

  it("refuses replayed attempt IDs and skipped transport attempt numbers", () => {
    expect(() => assessReferralTransport([
      attempt(1, "connection_timeout"),
      attempt(2, "connection_timeout", { attemptRef: "attempt-1" }),
    ])).toThrow(/Duplicate/);
    expect(() => assessReferralTransport([
      attempt(1, "connection_timeout"),
      attempt(3, "gateway_accepted"),
    ])).toThrow(/sequence/);
  });

  it("rejects invented receipts on failed network attempts", () => {
    expect(() => assessReferralTransport([
      attempt(1, "connection_timeout", { gatewayReceiptRef: "fake-receipt" }),
    ])).toThrow(/cannot claim/);
  });

  it("refuses unverifiable timestamps and free-text identifiers", () => {
    expect(() => assessReferralTransport([
      attempt(1, "gateway_accepted", { attemptedAt: "today at 9" }),
    ])).toThrow(/source, time, or sequence/);
    expect(() => assessReferralTransport([
      attempt(1, "gateway_accepted", { referralRef: "patient real name" }),
    ])).toThrow(/source, time, or sequence/);
  });
});
