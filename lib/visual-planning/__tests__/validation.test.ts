import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildValidScript } from "@/lib/scripts/__tests__/fixtures";
import { validateVisualPlan } from "../validateVisualPlan";
import { buildValidVisualPlan } from "./fixtures";

const scene = buildValidScene();
const script = buildValidScript();
const expected = {
  planId: "55555555-5555-4555-8555-555555555555",
  seriesId: scene.seriesId,
  sceneId: scene.id,
  scriptId: script.id,
  version: 1
};
const validate = (plan: unknown) => validateVisualPlan(plan, theWoundsWeKeep, scene, script, expected);

describe("VisualPlan validation", () => {
  it("accepts a valid VisualPlan", () => expect(validate(buildValidVisualPlan()).success).toBe(true));
  it("rejects invalid source block", () => {
    const p = buildValidVisualPlan(); p.visualBeats[0].sourceScriptBlockIds = ["missing"]; expect(validate(p).success).toBe(false);
  });
  it("rejects duplicate visual beat IDs", () => {
    const p = buildValidVisualPlan(); p.visualBeats[1].id = p.visualBeats[0].id; expect(validate(p).success).toBe(false);
  });
  it("rejects invalid focal character", () => {
    const p = buildValidVisualPlan(); p.visualBeats[0].focalCharacterIds = ["char_pip"]; expect(validate(p).success).toBe(false);
  });
  it("rejects invalid supporting character", () => {
    const p = buildValidVisualPlan(); p.visualBeats[0].supportingCharacterIds = ["char_pip"]; expect(validate(p).success).toBe(false);
  });
  it("rejects invalid continuity character", () => {
    const p = buildValidVisualPlan(); p.continuity.characters[0].characterId = "char_pip"; expect(validate(p).success).toBe(false);
  });
  it("rejects invalid staging character", () => {
    const p = buildValidVisualPlan(); p.staging.characterPositions[0].characterId = "char_pip"; expect(validate(p).success).toBe(false);
  });
  it("rejects location mismatch", () => {
    const p = buildValidVisualPlan(); p.continuity.locationId = null; expect(validate(p).success).toBe(false);
  });
  it("rejects missing ACTION coverage", () => {
    const p = buildValidVisualPlan(); p.visualBeats[0].sourceScriptBlockIds = ["block_2"]; expect(validate(p).success).toBe(false);
  });
  it("rejects missing DIALOGUE coverage", () => {
    const p = buildValidVisualPlan(); p.visualBeats[1].sourceScriptBlockIds = ["block_3"]; expect(validate(p).success).toBe(false);
  });
  it("rejects missing REACTION coverage", () => {
    const p = buildValidVisualPlan(); p.visualBeats[2].sourceScriptBlockIds = ["block_5"]; expect(validate(p).success).toBe(false);
  });
  it("rejects duration below tolerance", () => {
    const p = buildValidVisualPlan(); p.visualBeats.forEach((beat) => beat.estimatedDurationSeconds = 1); expect(validate(p).success).toBe(false);
  });
  it("rejects duration above tolerance", () => {
    const p = buildValidVisualPlan(); p.visualBeats.forEach((beat) => beat.estimatedDurationSeconds = 10); expect(validate(p).success).toBe(false);
  });
  it("rejects zero beat duration structurally", () => {
    const p = buildValidVisualPlan(); p.visualBeats[0].estimatedDurationSeconds = 0; expect(validate(p).success).toBe(false);
  });
  it("rejects missing protected mystery", () => {
    const p = buildValidVisualPlan(); p.continuityChecks.protectedMysteries = []; expect(validate(p).success).toBe(false);
  });
  it("rejects unknown protected canon", () => {
    const p = buildValidVisualPlan(); p.continuity.protectedCanon = ["missing"]; expect(validate(p).success).toBe(false);
  });
  it("rejects generation-provider fields", () => {
    const p = { ...buildValidVisualPlan(), provider: "x" }; expect(validate(p).success).toBe(false);
  });
  it("rejects imagePrompt fields", () => {
    const p = { ...buildValidVisualPlan(), imagePrompt: "render this" }; expect(validate(p).success).toBe(false);
  });
  it("rejects mismatched IDs", () => {
    const p = buildValidVisualPlan({ scriptId: "44444444-4444-4444-8444-444444444444" }); expect(validate(p).success).toBe(false);
  });
});
