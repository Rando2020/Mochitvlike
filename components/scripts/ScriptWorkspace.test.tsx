import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScript } from "@/lib/scripts/__tests__/fixtures";
import { ScriptWorkspace } from "./ScriptWorkspace";

const versions = [{
  id: "33333333-3333-4333-8333-333333333333",
  version: 1,
  status: "DRAFT" as const,
  estimatedDurationSeconds: 18,
  updatedAt: "2026-09-28T00:00:00Z"
}];

describe("ScriptWorkspace", () => {
  it("renders dialogue with human character names", () => {
    render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep} />);
    expect(screen.getByText("Orin")).toBeInTheDocument();
    expect(screen.getByText("I'm thinking. It's a terrible habit.")).toBeInTheDocument();
  });

  it("renders action as readable prose", () => {
    render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep} />);
    expect(screen.getByText(/tightens the bandage/i)).toBeInTheDocument();
  });

  it("shows the version selector", () => {
    render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep} />);
    expect(screen.getByRole("option", { name: "Draft v1" })).toBeInTheDocument();
  });

  it("shows human-readable Story Checks", () => {
    render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep} />);
    fireEvent.click(screen.getByRole("button", { name: /Story Checks/i }));
    expect(screen.getByText("Required change")).toBeInTheDocument();
    expect(screen.getByText("Protected mysteries")).toBeInTheDocument();
  });

  it("keeps Plan Visuals non-functional", () => {
    render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep} />);
    expect(screen.getByRole("button", { name: "Plan Visuals" })).toBeDisabled();
  });

  it("does not expose JSON or schema/model terminology", () => {
    const { container } = render(
      <ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep} />
    );
    expect(container.textContent).not.toContain("block_1");
    expect(container.textContent).not.toContain("json_schema");
    expect(container.textContent).not.toContain("OPENAI_SCRIPT_MODEL");
  });
});
