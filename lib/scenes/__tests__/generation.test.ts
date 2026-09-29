import { describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildSceneContext } from "../context/buildSceneContext";
import {
  generateSceneBlueprint,
  SceneGenerationError,
  type SceneBlueprintProvider
} from "../generateSceneBlueprint";
import { buildValidScene } from "./fixtures";

function provider(
  generated: unknown,
  repaired: unknown = generated
): SceneBlueprintProvider {
  return {
    generate: vi.fn(async ({ sceneId, context }) => ({
      ...(generated as object),
      id: sceneId,
      seriesId: context.seriesId
    })),
    repair: vi.fn(async ({ sceneId, context }) => ({
      ...(repaired as object),
      id: sceneId,
      seriesId: context.seriesId
    }))
  };
}

const seriesId = "22222222-2222-4222-8222-222222222222";
const context = buildSceneContext(seriesId, theWoundsWeKeep, "episodeOne", "beat_1");

describe("generateSceneBlueprint", () => {
  it("accepts valid structured output without repair", async () => {
    const p = provider(buildValidScene());
    const result = await generateSceneBlueprint({
      seriesId,
      beatId: "beat_1",
      seriesBlueprint: theWoundsWeKeep,
      context
    }, p);

    expect(result.source).toBe("llm");
    expect(p.repair).not.toHaveBeenCalled();
  });

  it("performs exactly one successful repair", async () => {
    const bad = buildValidScene();
    bad.location.locationId = "missing";
    const p = provider(bad, buildValidScene());

    const result = await generateSceneBlueprint({
      seriesId,
      beatId: "beat_1",
      seriesBlueprint: theWoundsWeKeep,
      context
    }, p);

    expect(result.source).toBe("repaired");
    expect(p.repair).toHaveBeenCalledTimes(1);
  });

  it("fails after one invalid repair rather than fabricating a fallback", async () => {
    const bad = buildValidScene();
    bad.location.locationId = "missing";
    const p = provider(bad, bad);

    await expect(
      generateSceneBlueprint({
        seriesId,
        beatId: "beat_1",
        seriesBlueprint: theWoundsWeKeep,
        context
      }, p)
    ).rejects.toBeInstanceOf(SceneGenerationError);

    expect(p.repair).toHaveBeenCalledTimes(1);
  });

  it("protects the required story change during generation validation", async () => {
    const bad = buildValidScene();
    bad.storyPurpose.requiredStoryChange = "Unrelated change";
    const p = provider(bad, buildValidScene());

    const result = await generateSceneBlueprint({
      seriesId,
      beatId: "beat_1",
      seriesBlueprint: theWoundsWeKeep,
      context
    }, p);

    expect(result.scene.storyPurpose.requiredStoryChange).toBe(
      theWoundsWeKeep.episodeOne.beats[0].storyChange
    );
  });

  it("does not mutate Series canon during generation", async () => {
    const series = structuredClone(theWoundsWeKeep);
    const before = JSON.stringify(series.canon);
    const p = provider(buildValidScene());

    await generateSceneBlueprint({
      seriesId,
      beatId: "beat_1",
      seriesBlueprint: series,
      context
    }, p);

    expect(JSON.stringify(series.canon)).toBe(before);
  });
});
