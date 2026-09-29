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

  it("enables Write Scene when no script exists", () => {
    render(<SceneWorkspace scene={buildValidScene()} series={theWoundsWeKeep} />);
    expect(screen.getByRole("button", { name: "Write Scene" })).toBeEnabled();
  });

  it("shows Continue Script when a durable script exists", () => {
    render(
      <SceneWorkspace
        scene={buildValidScene()}
        series={theWoundsWeKeep}
        latestScript={{
          id: "33333333-3333-4333-8333-333333333333",
          version: 1,
          status: "DRAFT",
          estimatedDurationSeconds: 18,
          updatedAt: "2026-09-28T00:00:00Z"
        }}
      />
    );
    expect(screen.getByRole("button", { name: "Continue Script" })).toBeEnabled();
  });

  it("labels canon changes as proposals only", () => {
    render(<SceneWorkspace scene={buildValidScene()} series={theWoundsWeKeep} />);
    expect(screen.getByText("These are proposals only. Canon has not been changed.")).toBeInTheDocument();
  });

  it("does not expose prompts or production configuration", () => {
    const { container } = render(
      <SceneWorkspace scene={buildValidScene()} series={theWoundsWeKeep} />
    );
    expect(container.textContent).not.toContain("system_prompt");
    expect(container.textContent).not.toContain("avatarPrompt");
    expect(container.textContent).not.toContain("model");
  });
});
