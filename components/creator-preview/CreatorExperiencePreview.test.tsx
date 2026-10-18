import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreatorExperiencePreview } from "./CreatorExperiencePreview";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";

describe("creator experience preview", () => {
  it("states the non-production boundaries and shows the guided creation experience", () => {
    render(<CreatorExperiencePreview blueprint={theWoundsWeKeep} />);
    expect(screen.getByRole("status").textContent).toMatch(/no saving/i);
    expect(screen.getByRole("heading", { name: /every story starts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview next steps/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your idea"), { target: { value: "A strange new world" } });
    expect(screen.getByRole("button", { name: /preview next steps/i })).toBeEnabled();
  });
  it("adds seeds in advanced mode, locks them, and never claims they were persisted", () => {
    render(<CreatorExperiencePreview blueprint={theWoundsWeKeep} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Creator preview sections" })).getByRole("button", { name: /Story$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Describe the moment"), { target: { value: "The companion discovers the secret" } });
    fireEvent.change(screen.getByLabelText("Story placement"), { target: { value: "MIDPOINT" } });
    fireEvent.click(screen.getByRole("button", { name: /add story seed/i }));
    const card = screen.getByText("The companion discovers the secret").closest("article");
    expect(card).not.toBeNull();
    fireEvent.click(within(card as HTMLElement).getByRole("button", { name: /lock this/i }));
    expect(within(card as HTMLElement).getByRole("button", { name: /locked/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/all edits here are temporary/i)).toBeInTheDocument();
  });
  it("keeps conversation a labeled scripted simulation and character sharing private by default", () => {
    render(<CreatorExperiencePreview blueprint={theWoundsWeKeep} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Creator preview sections" })).getByRole("button", { name: /Cast$/ }));
    expect(screen.getByText(/deterministic sample, not a connected ai chatbot/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /private not offered/i })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByLabelText("Preview a conversation prompt"), { target: { value: "What do you fear?" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(screen.getByText("What do you fear?")).toBeInTheDocument();
    expect(screen.getByText(/sample character direction, not live ai/i)).toBeInTheDocument();
  });
  it("calculates illustrative compute quotes without allowing purchases", () => {
    render(<CreatorExperiencePreview blueprint={theWoundsWeKeep} />);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Creator preview sections" })).getByRole("button", { name: /Coins$/ }));
    expect(screen.getByText(/no generation or credit charge/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Scene duration 5 seconds"), { target: { value: "10" } });
    expect(screen.getByText("28 coins")).toBeInTheDocument();
  });
});
