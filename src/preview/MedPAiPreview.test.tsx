import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MedPAiPreview from "./MedPAiPreview";

describe("standalone MedPAi preview", () => {
  it("opens into a useful sample workspace instead of a backend blocker", () => {
    render(<MedPAiPreview />);
    expect(screen.getByRole("heading", { name: /Care starts with clarity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explore the sample record/i })).toBeInTheDocument();
    expect(screen.getByText(/No patient records are used or saved/i)).toBeInTheDocument();
    expect(screen.queryByText(/temporarily unavailable while the isolated backend/i)).not.toBeInTheDocument();
  });

  it("lets a user explore sample records, flag an item and select review questions", () => {
    render(<MedPAiPreview />);
    fireEvent.click(screen.getByRole("button", { name: /Explore the sample record/i }));
    expect(screen.getByRole("heading", { name: "Medicine A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unidentified herbal product" })).toBeInTheDocument();

    const flag = screen.getAllByRole("button", { name: /^Flag$/i })[0];
    fireEvent.click(flag);
    expect(screen.getByText(/1 item flagged/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue to review/i }));
    expect(screen.getByText("Confirm medicine identity")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Clarify actual use/i));
    fireEvent.click(screen.getByRole("button", { name: /Create sample handoff/i }));

    expect(screen.getByText(/Questions selected for follow-up:/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinical interpretation, prescribing, and safety clearance: NOT PROVIDED/i)).toBeInTheDocument();
    expect(screen.queryByText(/cure|safe to take|take 500 ml/i)).not.toBeInTheDocument();
  });
});
