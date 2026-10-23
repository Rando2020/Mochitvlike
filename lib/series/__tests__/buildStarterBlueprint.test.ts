import { describe, expect, it } from "vitest";
import { buildStarterBlueprint } from "../buildStarterBlueprint";
import { SeriesBlueprintSchema } from "../schema";
import { hasValidSeriesBlueprintInvariants } from "../persistence/validateBlueprintInvariants";

describe("zero-AI starter show", () => {
  it("creates a truly original placeholder scaffold, never copies the sample show's canon", () => {
    const idea = "An observatory discovers the stars are memories held by migrating birds.";
    const blueprint = buildStarterBlueprint({ idea });
    expect(SeriesBlueprintSchema.safeParse(blueprint).success).toBe(true);
    expect(hasValidSeriesBlueprintInvariants(blueprint)).toBe(true);
    expect(blueprint.identity.shortPremise).toBe(idea);
    expect(blueprint.identity.logline).toBe(idea);
    expect(blueprint.cast).toHaveLength(3);
    expect(blueprint.episodeOne.beats).toHaveLength(4);
    expect(blueprint.canon.facts).toHaveLength(0);
    expect(blueprint.confidence.overall).toBe(0);
    expect(JSON.stringify(blueprint)).not.toMatch(/Orin|Mara|The Wounds We Keep|Rook's Hollow/);
    expect(blueprint.confidence.assumptions.join(" ")).toContain("no AI-generated plot");
  });

  it("preserves the full maximum length brief in order, without fabricating AI work", () => {
    const idea = "Memory of the observatory. ".repeat(200).slice(0, 5000);
    const blueprint = buildStarterBlueprint({ idea, preferences: { episodeLengthSeconds: 90, targetEpisodeCount: 16 } });
    const segments = blueprint.confidence.assumptions.slice(1).map(x => x.replace(/^Original creator idea, part \d+\/\d+: /, ""));
    expect(segments.join("")).toBe(idea);
    expect(blueprint.season.format).toEqual({ episodeLengthSeconds: 90, targetEpisodeCount: 16 });
    expect(blueprint.identity.shortPremise.length).toBeLessThanOrEqual(1200);
    expect(SeriesBlueprintSchema.safeParse(blueprint).success).toBe(true);
  });

  it("retains user-authored character direction without assigning invented character traits", () => {
    const input = { idea: "A pianist finds a hidden city under the conservatory." };
    const blueprint = buildStarterBlueprint(input);
    expect(blueprint.cast[0].personalityTraits).toHaveLength(0);
    expect(blueprint.world.locations).toHaveLength(0);
    expect(blueprint.episodeOne.beats[0].summary).toContain("decided by the creator");
  });
});
