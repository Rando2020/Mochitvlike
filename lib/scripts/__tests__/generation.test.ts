import { describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildScriptContext } from "../context/buildScriptContext";
import {
  generateSceneScript,
  ScriptGenerationError,
  type SceneScriptProvider
} from "../generateSceneScript";
import { buildValidScript } from "./fixtures";

const seriesId = "22222222-2222-4222-8222-222222222222";
const scene = buildValidScene();
const context = buildScriptContext({
  seriesId,
  sceneId: scene.id,
  version: 1,
  series: theWoundsWeKeep,
  scene
});

function provider(generated: unknown, repaired: unknown = generated): SceneScriptProvider {
  return {
    generate: vi.fn(async ({ scriptId, context }) => ({
      ...(generated as object),
      id: scriptId,
      sceneId: context.sceneId,
      seriesId: context.seriesId,
      version: context.version
    })),
    repair: vi.fn(async ({ scriptId, context }) => ({
      ...(repaired as object),
      id: scriptId,
      sceneId: context.sceneId,
      seriesId: context.seriesId,
      version: context.version
    }))
  };
}

describe("generateSceneScript", () => {
  it("accepts a valid first response", async () => {
    const p = provider(buildValidScript());
    const result = await generateSceneScript({
      seriesId,
      sceneId: scene.id,
      version: 1,
      series: theWoundsWeKeep,
      scene,
      context
    }, p);
    expect(result.source).toBe("llm");
    expect(p.repair).not.toHaveBeenCalled();
  });

  it("repairs exactly once when the first script is invalid", async () => {
    const bad = buildValidScript({ estimatedDurationSeconds: 100 });
    const p = provider(bad, buildValidScript());
    const result = await generateSceneScript({
      seriesId,
      sceneId: scene.id,
      version: 1,
      series: theWoundsWeKeep,
      scene,
      context
    }, p);
    expect(result.source).toBe("repaired");
    expect(p.repair).toHaveBeenCalledTimes(1);
  });

  it("fails after one invalid repair", async () => {
    const bad = buildValidScript({ estimatedDurationSeconds: 100 });
    const p = provider(bad, bad);
    await expect(generateSceneScript({
      seriesId,
      sceneId: scene.id,
      version: 1,
      series: theWoundsWeKeep,
      scene,
      context
    }, p)).rejects.toBeInstanceOf(ScriptGenerationError);
    expect(p.repair).toHaveBeenCalledTimes(1);
  });

  it("does not fabricate a fallback", async () => {
    const bad = buildValidScript();
    bad.endingStateVerification.requiredStoryChangeAchieved = false;
    await expect(generateSceneScript({
      seriesId,
      sceneId: scene.id,
      version: 1,
      series: theWoundsWeKeep,
      scene,
      context
    }, provider(bad, bad))).rejects.toMatchObject({ code: "SCRIPT_REPAIR_FAILED" });
  });

  it("does not mutate canon or scene canon proposals", async () => {
    const series = structuredClone(theWoundsWeKeep);
    const localScene = structuredClone(scene);
    const canonBefore = JSON.stringify(series.canon);
    const proposalsBefore = JSON.stringify(localScene.proposedCanonChanges);

    await generateSceneScript({
      seriesId,
      sceneId: localScene.id,
      version: 1,
      series,
      scene: localScene,
      context
    }, provider(buildValidScript()));

    expect(JSON.stringify(series.canon)).toBe(canonBefore);
    expect(JSON.stringify(localScene.proposedCanonChanges)).toBe(proposalsBefore);
  });
});
