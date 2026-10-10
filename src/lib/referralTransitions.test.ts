import { describe, expect, it } from "vitest";
import {
  replayReferralEvents, referralStageDescription, type ReferralEvent,
} from "./referralTransitions";

// Protocol test metadata are fictional and remain exclusively inside tests.
// They must never seed the actual product UI or represent a real person.
const authorized = (e: ReferralEvent) =>
  (e.actorRole === "referring_provider" && e.actorRef === "test-sender") ||
  (e.actorRole === "receiving_provider" && e.actorRef === "test-receiver");
function event(
  nextState: ReferralEvent["nextState"],
  previousState: ReferralEvent["previousState"],
  sequence: number,
  actorRole: ReferralEvent["actorRole"],
  overrides: Partial<ReferralEvent> = {},
): ReferralEvent {
  return {
    referralRef: "TEST-ONLY-REFERRAL", eventRef: "event-" + sequence,
    sequence, actorRef: actorRole === "referring_provider" ? "test-sender" : "test-receiver",
    actorRole, previousState, nextState,
    occurredAt: "2026-10-10T09:00:00Z", ...overrides,
  };
}

describe("closed-loop referral protocol without clinical decisions", () => {
  const prepared = event("prepared", "draft", 1, "referring_provider");
  const transmitted = event("transmitted", "prepared", 2, "referring_provider");
  const received = event("received", "transmitted", 3, "receiving_provider");
  const accepted = event("accepted", "received", 4, "receiving_provider");
  const arrived = event("arrived", "accepted", 5, "receiving_provider");
  const completed = event("completed", "arrived", 6, "receiving_provider");

  it("never equates sent with received, accepted, arrived or completed", () => {
    const progress = replayReferralEvents([prepared, transmitted], authorized);
    expect(progress).toMatchObject({
      currentState: "transmitted",
      transmitted: true, acknowledgedByReceiver: false,
      acceptedByReceiver: false, arrivedAtDestination: false,
      completedByReceiver: false, outstandingAcknowledgment: true,
    });
    expect(referralStageDescription(progress)).toMatch(/not confirmed/);
  });

  it("requires separate receiving-team events for each outcome", () => {
    const progress = replayReferralEvents(
      [prepared, transmitted, received, accepted, arrived, completed], authorized,
    );
    expect(progress).toMatchObject({
      currentState: "completed",
      acknowledgedByReceiver: true,
      acceptedByReceiver: true,
      arrivedAtDestination: true,
      completedByReceiver: true,
      outstandingAcknowledgment: false,
    });
  });

  it("does not invent receiver acknowledgment when transport fails", () => {
    const history = [
      prepared, transmitted,
      event("unreachable", "transmitted", 3, "referring_provider"),
    ];
    const progress = replayReferralEvents(history, authorized);
    expect(progress.outstandingAcknowledgment).toBe(true);
    expect(progress.completedByReceiver).toBe(false);
    expect(referralStageDescription(progress)).toMatch(/fallback/);
  });

  it("can accept a late actual receiver acknowledgment after unreachable", () => {
    const progress = replayReferralEvents([
      prepared, transmitted,
      event("unreachable", "transmitted", 3, "referring_provider"),
      event("received", "unreachable", 4, "receiving_provider"),
    ], authorized);
    expect(progress.acknowledgedByReceiver).toBe(true);
    expect(progress.acceptedByReceiver).toBe(false);
  });

  it("refuses sender fabrication of receiver acceptance", () => {
    expect(() => replayReferralEvents([
      prepared, transmitted,
      event("received", "transmitted", 3, "referring_provider"),
    ], authorized)).toThrow(/Impossible/);
  });

  it("refuses self-claimed receiver credentials unless independently authorized", () => {
    expect(() => replayReferralEvents([
      prepared, transmitted,
      event("received", "transmitted", 3, "receiving_provider", { actorRef: "attacker" }),
    ], authorized)).toThrow(/authorization/);
  });

  it("does not permit marking complete before arrival and acceptance", () => {
    expect(() => replayReferralEvents([
      prepared, transmitted, received,
      event("completed", "received", 4, "receiving_provider"),
    ], authorized)).toThrow(/Impossible/);
  });

  it("refuses mixing unrelated referrals, replay events and sequence gaps", () => {
    expect(() => replayReferralEvents([
      prepared, { ...transmitted, referralRef: "ANOTHER-CASE" },
    ], authorized)).toThrow(/different referrals/);
    expect(() => replayReferralEvents([
      prepared, { ...transmitted, eventRef: prepared.eventRef },
    ], authorized)).toThrow(/Duplicate event/);
    expect(() => replayReferralEvents([
      prepared, { ...transmitted, sequence: 99 },
    ], authorized)).toThrow(/provenance or sequence/);
  });

  it("requires a verifier and valid provenance before any status can advance", () => {
    expect(() => replayReferralEvents([prepared], undefined as never)).toThrow(/external actor-role/);
    expect(() => replayReferralEvents([{ ...prepared, occurredAt: "not a date" }], authorized))
      .toThrow(/provenance/);
  });

  it("keeps a declined referral distinct from any completed encounter", () => {
    const progress = replayReferralEvents([
      prepared, transmitted, received,
      event("declined", "received", 4, "receiving_provider"),
    ], authorized);
    expect(progress).toMatchObject({
      currentState: "declined", acknowledgedByReceiver: true,
      acceptedByReceiver: false, completedByReceiver: false,
    });
    expect(referralStageDescription(progress)).toMatch(/declined/);
  });
});
