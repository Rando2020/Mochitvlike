import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildValidScript } from "@/lib/scripts/__tests__/fixtures";
import { buildVisualPlanningContext } from "../context/buildVisualPlanningContext";

describe("buildVisualPlanningContext", () => {
  const context = buildVisualPlanningContext({
    seriesId: "22222222-2222-4222-8222-222222222222",
    sceneId: "11111111-1111-4111-8111-111111111111",
    scriptId: "33333333-3333-4333-8333-333333333333",
    version: 1,
    series: theWoundsWeKeep,
    scene: buildValidScene(),
    script: buildValidScript()
  });

  it("includes SceneBlueprint", () => expect(context.scene.sourceBeatId).toBe("beat_1"));
  it("includes SceneScript", () => expect(context.script.version).toBe(1));
  it("includes Creative DNA", () => expect(context.creativeDNA.description).toContain("Weathered fantasy"));
  it("includes camera language", () => expect(context.creativeDNA.cameraLanguage).toContain("Intimate"));
  it("includes animation language", () => expect(context.creativeDNA.animationLanguage).toContain("Grounded"));
  it("includes color language", () => expect(context.creativeDNA.colorLanguage).toContain("Muted"));
  it("includes lighting", () => expect(context.creativeDNA.lighting).toContain("Natural"));
  it("includes relevant cast only", () => expect(context.cast.map((member) => member.id)).toEqual(["char_orin","char_mara"]));
  it("excludes unrelated cast", () => expect(context.cast.some((member) => member.id === "char_pip")).toBe(false));
  it("includes visualConcept", () => expect(context.cast[0].visualConcept).toContain("field medic"));
  it("includes visualDescription", () => expect(context.cast[0].visualDescription).toContain("wrapped hands"));
  it("does not include communication style", () => expect(context.cast[0]).not.toHaveProperty("communicationStyle"));
  it("includes location", () => expect(context.location?.id).toBe("location_border_town"));
  it("includes location visual tags", () => expect(context.location?.visualTags).toContain("rain-dark stone"));
  it("includes protected mysteries", () => expect(context.protectedMysteries[0].id).toBe("mystery_creatures"));
  it("includes power-system rules", () => expect(context.powerSystem?.rules.length).toBeGreaterThan(0));
});
