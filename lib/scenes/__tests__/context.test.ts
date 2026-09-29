import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildSceneContext, SceneContextError } from "../context/buildSceneContext";

describe("buildSceneContext", () => {
  it("selects the requested beat", () => {
    const context = buildSceneContext("series-1", theWoundsWeKeep, "episodeOne", "beat_1");
    expect(context.sourceBeat.id).toBe("beat_1");
  });

  it("excludes unrelated cast", () => {
    const context = buildSceneContext("series-1", theWoundsWeKeep, "episodeOne", "beat_1");
    expect(context.involvedCast.map((member) => member.id)).toEqual(["char_orin", "char_mara"]);
    expect(context.involvedCast.some((member) => member.id === "char_pip")).toBe(false);
  });

  it("includes relevant relationships only", () => {
    const context = buildSceneContext("series-1", theWoundsWeKeep, "episodeOne", "beat_1");
    expect(context.relationships).toHaveLength(1);
    expect(context.relationships[0].toCharacterId).toBe("char_mara");
  });

  it("includes the beat location", () => {
    const context = buildSceneContext("series-1", theWoundsWeKeep, "episodeOne", "beat_1");
    expect(context.location?.id).toBe("location_border_town");
  });

  it("includes relevant canon facts", () => {
    const context = buildSceneContext("series-1", theWoundsWeKeep, "episodeOne", "beat_1");
    expect(context.canonFacts.map((fact) => fact.id)).toEqual(expect.arrayContaining(["fact_transfer", "fact_banned"]));
  });

  it("includes the active power system when one exists", () => {
    const context = buildSceneContext("series-1", theWoundsWeKeep, "episodeOne", "beat_1");
    expect(context.powerSystem?.name).toBe("Burden Healing");
  });

  it("throws for an unknown beat", () => {
    expect(() =>
      buildSceneContext("series-1", theWoundsWeKeep, "episodeOne", "missing")
    ).toThrow(SceneContextError);
  });
});
