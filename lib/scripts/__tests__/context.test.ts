import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildScriptContext } from "../context/buildScriptContext";

describe("buildScriptContext", () => {
  const context = buildScriptContext({
    seriesId: "22222222-2222-4222-8222-222222222222",
    sceneId: "11111111-1111-4111-8111-111111111111",
    version: 1,
    series: theWoundsWeKeep,
    scene: buildValidScene()
  });

  it("includes the validated SceneBlueprint", () => {
    expect(context.scene.sourceBeatId).toBe("beat_1");
  });

  it("includes relevant cast", () => {
    expect(context.cast.map((member) => member.id)).toEqual(["char_orin", "char_mara"]);
  });

  it("excludes unrelated cast", () => {
    expect(context.cast.some((member) => member.id === "char_pip")).toBe(false);
  });

  it("includes communication style", () => {
    expect(context.cast.find((member) => member.id === "char_orin")?.communicationStyle).toContain("sarcastic");
  });

  it("includes personality guidance", () => {
    expect(context.cast.find((member) => member.id === "char_mara")?.personality).toContain("practical");
  });

  it("includes relevant canon", () => {
    expect(context.relevantCanonFacts.map((fact) => fact.id)).toEqual(expect.arrayContaining(["fact_transfer", "fact_banned"]));
  });

  it("includes protected mysteries", () => {
    expect(context.protectedMysteries.map((mystery) => mystery.id)).toContain("mystery_creatures");
  });

  it("derives a bounded duration target", () => {
    expect(context.estimatedTargetSeconds).toBeGreaterThanOrEqual(5);
    expect(context.estimatedTargetSeconds).toBeLessThanOrEqual(theWoundsWeKeep.season.format.episodeLengthSeconds);
  });
});
