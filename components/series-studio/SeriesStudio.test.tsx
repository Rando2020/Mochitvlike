import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanonPanel } from "./CanonPanel";
import { ClarificationCard } from "./ClarificationCard";
import { CreativeDNA } from "./CreativeDNA";
import { SeriesStudio } from "./SeriesStudio";
import { StudioFeatureGrid } from "./StudioFeatureGrid";
import { StudioFeatureRenderer } from "./StudioFeatureRenderer";
import { WorldPanel } from "./WorldPanel";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";

function clone(): SeriesBlueprint {
  return structuredClone(theWoundsWeKeep);
}

describe("Series Studio", () => {
  it("renders the series identity and primary actions", () => {
    render(<SeriesStudio seriesId="demo" blueprint={clone()} />);

    expect(screen.getAllByText("The Wounds We Keep").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Continue Episode" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Series Bible" }).length).toBeGreaterThan(0);
  });

  it("keeps episode beats in blueprint order", () => {
    render(<SeriesStudio seriesId="demo" blueprint={clone()} />);

    const studio = screen.getByTestId("studio-tab").textContent ?? "";
    const beatSummaries = theWoundsWeKeep.episodeOne.beats.map((beat) => beat.summary);
    let previous = -1;

    for (const summary of beatSummaries) {
      const index = studio.indexOf(summary);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
  });

  it("renders cast and opens cast detail without exposing characterSheetSeed", () => {
    render(<SeriesStudio seriesId="demo" blueprint={clone()} />);

    expect(screen.getByRole("button", { name: "Open Orin" })).toBeInTheDocument();
    expect(screen.queryByText(theWoundsWeKeep.cast[0].characterSheetSeed.backstory)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Orin" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Inner conflict")).toBeInTheDocument();
    expect(within(dialog).getByText(theWoundsWeKeep.cast[0].internalConflict)).toBeInTheDocument();
    expect(within(dialog).queryByText(theWoundsWeKeep.cast[0].characterSheetSeed.backstory)).not.toBeInTheDocument();
  });

  it("converts normalized creative DNA values into readable meters", () => {
    render(<CreativeDNA blueprint={clone()} />);

    expect(screen.getByLabelText("Emotional intensity 76%")).toBeInTheDocument();
    expect(screen.getByLabelText("Darkness 67%")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("omits empty world collections and uses a contextual empty state", () => {
    const blueprint = clone();
    blueprint.world.rules = [];
    blueprint.world.locations = [];
    blueprint.world.factions = [];
    blueprint.world.powerSystem = {
      exists: false,
      name: null,
      summary: null,
      rules: [],
      costs: [],
      limitations: []
    };

    render(<WorldPanel blueprint={blueprint} />);

    expect(screen.queryByText("Rules that matter")).not.toBeInTheDocument();
    expect(screen.queryByText("Places")).not.toBeInTheDocument();
    expect(screen.queryByText("Forces in play")).not.toBeInTheDocument();
    expect(screen.getByText(/first important place and rules will emerge/i)).toBeInTheDocument();
  });

  it("hides clarification when no decision is needed", () => {
    const blueprint = clone();
    blueprint.clarification = { needed: false, questions: [] };

    render(<ClarificationCard blueprint={blueprint} />);
    expect(screen.queryByText("One choice could change your show")).not.toBeInTheDocument();
  });

  it("shows clarification when a meaningful decision exists", () => {
    render(<ClarificationCard blueprint={clone()} />);
    expect(screen.getByText("One choice could change your show")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help me decide" })).toBeInTheDocument();
  });

  it("places PRIMARY tools on the dashboard and SECONDARY tools under Story Tools", () => {
    render(<SeriesStudio seriesId="demo" blueprint={clone()} />);

    const storyToolsTitle = screen.getByText("Story Tools");
    const storyTools = storyToolsTitle.closest("section");
    expect(storyTools).not.toBeNull();

    expect(within(storyTools as HTMLElement).getByText("Character Knowledge")).toBeInTheDocument();
    expect(within(storyTools as HTMLElement).getByText("Ability Tracker")).toBeInTheDocument();
    expect(within(storyTools as HTMLElement).queryByText("Power System")).not.toBeInTheDocument();
  });

  it("fails safely for an unknown Studio feature", () => {
    const unknown = {
      type: "FUTURE_UNKNOWN_FEATURE",
      reason: "Future data",
      priority: "PRIMARY"
    } as unknown as StudioFeature;

    const { container } = render(
      <StudioFeatureRenderer feature={unknown} blueprint={clone()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("activates the clue ledger through the registry rather than genre checks", () => {
    const blueprint = clone();
    const feature: StudioFeature = {
      type: "CLUE_LEDGER",
      reason: "The mystery needs persistent evidence tracking.",
      priority: "PRIMARY"
    };

    render(<StudioFeatureGrid features={[feature]} blueprint={blueprint} />);
    expect(screen.getAllByText("Clue Ledger").length).toBeGreaterThan(0);
    expect(screen.getByText(/Clues will appear as you develop episodes/i)).toBeInTheDocument();
  });

  it("activates the power-system panel through the registry", () => {
    const blueprint = clone();
    const feature: StudioFeature = {
      type: "POWER_SYSTEM",
      reason: "Power drives consequences.",
      priority: "PRIMARY"
    };

    render(<StudioFeatureGrid features={[feature]} blueprint={blueprint} />);
    expect(screen.getByText("Burden Healing")).toBeInTheDocument();
    expect(screen.getByText(/Every transferred wound remains inside Orin/i)).toBeInTheDocument();
  });

  it("uses one state model for mobile and desktop navigation", () => {
    render(<SeriesStudio seriesId="demo" blueprint={clone()} />);

    const worldButtons = screen.getAllByRole("button", { name: "World" });
    expect(worldButtons.length).toBe(2);

    fireEvent.click(worldButtons[0]);
    expect(screen.getByTestId("world-tab")).toBeInTheDocument();

    const episodeButtons = screen.getAllByRole("button", { name: "Episode" });
    fireEvent.click(episodeButtons[1]);
    expect(screen.getByTestId("episode-tab")).toBeInTheDocument();
  });

  it("renders canon facts and mysteries without exposing backend terminology", () => {
    render(<CanonPanel blueprint={clone()} />);

    expect(screen.getByText("Established")).toBeInTheDocument();
    expect(screen.getByText("Open mysteries")).toBeInTheDocument();
    expect(screen.queryByText("subjectType")).not.toBeInTheDocument();
  });
});
