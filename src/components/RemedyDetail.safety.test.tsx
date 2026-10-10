import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RemedyDetail } from "./RemedyDetail";
import type { Remedy } from "@/data/remedies";

vi.mock("@/components/SafetyGate", () => ({
  SafetyGate: () => null,
}));
vi.mock("@/components/PharmacyFinder", () => ({
  PharmacyFinder: () => null,
}));

const unreviewedRemedy: Remedy = {
  id: "safety-test",
  name: "Unreviewed plant",
  localName: "Test herb",
  emoji: "🌿",
  treats: ["test"],
  blurb: "Cures everything (unverified claim)",
  imageHint: "test",
  prep: [{ verb: "DRINK", text: "Drink a full bottle (unverified instruction)" }],
  dose: "Take 500 mL three times daily (unverified dose)",
  intervalHours: 8,
  interactions: [{ drug: "Test drug", level: "green", why: "Safe combo (unverified)" }],
  science: {
    phytochemicals: [],
    evidence: { citation: "unverified", summary: "Cure is guaranteed (unverified)" },
    toxicity: { notes: "Unverified" },
    source: { label: "unverified", url: "https://example.org" },
  },
};

describe("unreviewed remedy safety hold", () => {
  it("shows a clinical review hold instead of actionable use, dose or interaction claims", () => {
    render(<RemedyDetail remedy={unreviewedRemedy} onBack={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Clinical review required");
    expect(screen.getByText(/We have temporarily disabled/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Find a pharmacist for review/i })).toBeInTheDocument();

    expect(screen.queryByText(/Drink a full bottle/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Take 500 mL/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Safe combo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cure is guaranteed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cures everything/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Set alarm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue with remedy/i })).not.toBeInTheDocument();
  });
});
