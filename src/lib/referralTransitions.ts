/**
 * Protocol-only care referral state transitions.
 * Does not triage, determine urgency, dispatch emergency transport, store PHI,
 * sign clinicians, or contact health systems.
 * The authoritative backend MUST verify patient permission, role, organization,
 * target facility, monotonic sequence, immutable events and server time.
 */
export type ReferralState =
  | "draft" | "prepared" | "transmitted" | "unreachable"
  | "received" | "accepted" | "declined" | "arrived"
  | "completed" | "not_attended" | "cancelled";

export type ReferralActorRole = "referring_provider" | "receiving_provider";

export interface ReferralEvent {
  /** Opaque scoped reference, never a patient name or public URL token. */
  referralRef: string;
  eventRef: string;
  /** Monotonic sequence assigned and enforced by an authorized server. */
  sequence: number;
  actorRef: string;
  actorRole: ReferralActorRole;
  previousState: ReferralState;
  nextState: ReferralState;
  /**
   * Claimed event time for display. Not authoritative for ordering or proof.
   * The server must append its own received-at time.
   */
  occurredAt: string;
}

export interface ReferralMilestones {
  currentState: ReferralState;
  transmitted: boolean;
  acknowledgedByReceiver: boolean;
  acceptedByReceiver: boolean;
  arrivedAtDestination: boolean;
  completedByReceiver: boolean;
  /** Tells users there is not yet proof of contact or closure. */
  outstandingAcknowledgment: boolean;
}

type TransitionRule = { from: ReferralState; to: ReferralState; role: ReferralActorRole };
const TRANSITIONS: ReadonlyArray<TransitionRule> = [
  { from: "draft", to: "prepared", role: "referring_provider" },
  { from: "draft", to: "cancelled", role: "referring_provider" },
  { from: "prepared", to: "transmitted", role: "referring_provider" },
  { from: "prepared", to: "cancelled", role: "referring_provider" },
  { from: "transmitted", to: "received", role: "receiving_provider" },
  { from: "transmitted", to: "unreachable", role: "referring_provider" },
  { from: "unreachable", to: "received", role: "receiving_provider" },
  { from: "received", to: "accepted", role: "receiving_provider" },
  { from: "received", to: "declined", role: "receiving_provider" },
  { from: "accepted", to: "arrived", role: "receiving_provider" },
  { from: "accepted", to: "not_attended", role: "receiving_provider" },
  { from: "arrived", to: "completed", role: "receiving_provider" },
];

/**
 * VerifyRole MUST be wired to trusted backend authorization.
 * A client's self-asserted actorRole is NOT an authorization credential.
 * No verifier = no valid transition.
 */
export type VerifyRole = (event: Readonly<ReferralEvent>) => boolean;

export function replayReferralEvents(
  events: readonly ReferralEvent[],
  verifyRole: VerifyRole,
): ReferralMilestones {
  if (typeof verifyRole !== "function") {
    throw new Error("Referral events require external actor-role authorization.");
  }
  let currentState: ReferralState = "draft";
  let initialRef: string | null = null;
  const seenRefs = new Set<string>();
  let received = false, accepted = false, arrived = false, completed = false;
  let transmitted = false;
  for (const [index, event] of events.entries()) {
    if (!event || !event.referralRef?.trim() || !event.eventRef?.trim() ||
        !event.actorRef?.trim() || !Number.isSafeInteger(event.sequence) ||
        event.sequence !== index + 1 ||
        !Number.isFinite(Date.parse(event.occurredAt))) {
      throw new Error("Referral event is missing required provenance or sequence.");
    }
    if (initialRef !== null && event.referralRef !== initialRef) {
      throw new Error("Cannot combine events from different referrals.");
    }
    initialRef = event.referralRef;
    if (seenRefs.has(event.eventRef)) throw new Error("Duplicate event; needs idempotent server replay handling.");
    seenRefs.add(event.eventRef);
    const permitted = TRANSITIONS.some(rule =>
      rule.from === currentState &&
      rule.to === event.nextState &&
      rule.role === event.actorRole,
    );
    if (event.previousState !== currentState || !permitted) {
      throw new Error("Impossible or unauthorized referral transition order.");
    }
    if (!verifyRole(event)) {
      throw new Error("Referral actor authorization unavailable or denied.");
    }
    currentState = event.nextState;
    if (event.nextState === "transmitted") transmitted = true;
    if (event.nextState === "received") received = true;
    if (event.nextState === "accepted") accepted = true;
    if (event.nextState === "arrived") arrived = true;
    if (event.nextState === "completed") completed = true;
  }
  return {
    currentState,
    transmitted,
    acknowledgedByReceiver: received,
    acceptedByReceiver: accepted,
    arrivedAtDestination: arrived,
    completedByReceiver: completed,
    outstandingAcknowledgment: transmitted && !received,
  };
}

/** Distinguish transport success from actual care reception and completion. */
export function referralStageDescription(milestones: ReferralMilestones): string {
  if (milestones.completedByReceiver) return "Receiving team recorded completion.";
  if (milestones.currentState === "not_attended") return "Receiving team recorded non-attendance; follow-up may be required.";
  if (milestones.currentState === "declined") return "Receiving team declined the referral; the care team must review an alternative.";
  if (milestones.currentState === "unreachable") return "No receiving-team acknowledgment confirmed; use the established fallback.";
  if (milestones.arrivedAtDestination) return "Arrival recorded; treatment or review completion not confirmed.";
  if (milestones.acceptedByReceiver) return "Receiving team accepted; arrival not confirmed.";
  if (milestones.acknowledgedByReceiver) return "Receipt acknowledged; acceptance not confirmed.";
  if (milestones.transmitted) return "Transmission recorded; receiver acknowledgment not confirmed.";
  if (milestones.currentState === "prepared") return "Prepared but not transmitted.";
  return "No referral sent.";
}
