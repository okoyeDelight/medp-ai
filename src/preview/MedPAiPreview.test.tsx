import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import MedPAiPreview from "./MedPAiPreview";

describe("MedPAi reconciliation workspace without backend", () => {
  it("opens with zero records and no invented medicine, patient or clinical result", () => {
    render(<MedPAiPreview />);
    expect(screen.getByRole("heading", { name: /Care starts with clarity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add a medicine or product/i })).toBeInTheDocument();
    expect(screen.getByText(/Do not enter identifiable or confidential patient data/i)).toBeInTheDocument();
    expect(screen.queryByText("Medicine A")).not.toBeInTheDocument();
    expect(screen.queryByText(/fictional|demo|example case/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/temporarily unavailable while the isolated backend/i)).not.toBeInTheDocument();
  });

  it("keeps an empty record empty until someone adds information", () => {
    render(<MedPAiPreview />);
    fireEvent.click(screen.getByRole("button", { name: /Medicine record/i }));
    expect(screen.getByText(/No medicine information entered yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue to review/i }));
    fireEvent.click(screen.getByRole("button", { name: /Prepare handoff/i }));
    expect(screen.getByText(/No information has been entered/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy handoff/i })).toBeDisabled();
  });

  it("captures, edits, flags and removes only user-entered data", () => {
    render(<MedPAiPreview />);
    fireEvent.click(screen.getByRole("button", { name: /Add a medicine or product/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /Medicine or product name/i }), {
      target: { value: "Entered product" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /What use was reported/i }), {
      target: { value: "Reported use from a conversation" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Source of information/i }), {
      target: { value: "packaging" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add to session/i }));
    expect(screen.getByRole("heading", { name: "Entered product" })).toBeInTheDocument();
    expect(screen.getByText(/Reported use from a conversation/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Edit$/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /Medicine or product name/i }), {
      target: { value: "Corrected product name" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Update item/i }));
    expect(screen.getByRole("heading", { name: "Corrected product name" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Entered product" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue to review/i }));
    fireEvent.click(screen.getByLabelText(/Confirm identity and strength/i));
    fireEvent.click(screen.getByRole("button", { name: /Prepare handoff/i }));
    expect(screen.getByText(/Corrected product name/i)).toBeInTheDocument();
    expect(screen.getByText(/No interaction clearance or clinical treatment recommendation/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Medicine record/i }));
    fireEvent.click(screen.getByRole("button", { name: /Remove Corrected product name/i }));
    expect(screen.getByText(/No medicine information entered yet/i)).toBeInTheDocument();
  });
});
