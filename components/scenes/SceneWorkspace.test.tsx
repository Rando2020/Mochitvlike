import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { SceneWorkspace } from "./SceneWorkspace";

describe("SceneWorkspace", () => {
  it("shows the scene purpose and required change", () => {
    const scene = buildValidScene();
    render(<SceneWorkspace scene={scene} series={theWoundsWeKeep} />);
    expect(screen.getByText("Why this scene exists")).toBeInTheDocument();
    expect(screen.getAllByText(scene.storyPurpose.requiredStoryChange).length).toBeGreaterThan(0);
  });

  it("shows Write Scene as the next disabled dependency", () => {
    render(<SceneWorkspace scene={buildValidScene()} series={theWoundsWeKeep} />);
    expect(screen.getByRole("button", { name: "Write Scene" })).toBeDisabled();
  });

  it("labels canon changes as proposals only", () => {
    render(<SceneWorkspace scene={buildValidScene()} series={theWoundsWeKeep} />);
    expect(screen.getByText("These are proposals only. Canon has not been changed.")).toBeInTheDocument();
  });

  it("does not expose prompts or final dialogue", () => {
    const { container } = render(
      <SceneWorkspace scene={buildValidScene()} series={theWoundsWeKeep} />
    );
    expect(container.textContent).not.toContain("system_prompt");
    expect(container.textContent).not.toContain("avatarPrompt");
    expect(container.textContent).not.toContain("FINAL DIALOGUE");
  });
});
