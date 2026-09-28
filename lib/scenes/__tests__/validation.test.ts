import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { validateSceneBlueprint } from "../validateSceneBlueprint";
import { buildValidScene } from "./fixtures";

const expected = {
  sceneId: "11111111-1111-4111-8111-111111111111",
  seriesId: "22222222-2222-4222-8222-222222222222",
  beatId: "beat_1"
};

function removeMaraFromActiveScene(scene: ReturnType<typeof buildValidScene>) {
  scene.cast = scene.cast.filter((member) => member.characterId !== "char_mara");
  scene.dialogueIntent = scene.dialogueIntent.filter((entry) => entry.characterId !== "char_mara");
  scene.openingState.emotionalStateByCharacter =
    scene.openingState.emotionalStateByCharacter.filter((entry) => entry.characterId !== "char_mara");
  scene.openingState.knownFactsByCharacter =
    scene.openingState.knownFactsByCharacter.filter((entry) => entry.characterId !== "char_mara");
  scene.endingState.characterChanges =
    scene.endingState.characterChanges.filter((entry) => entry.characterId !== "char_mara");
  scene.endingState.knowledgeChanges =
    scene.endingState.knowledgeChanges.filter((entry) => entry.characterId !== "char_mara");
  scene.endingState.relationshipChanges = [];
}

describe("SceneBlueprint validation", () => {
  it("accepts a valid scene", () => {
    expect(validateSceneBlueprint(buildValidScene(), theWoundsWeKeep, expected).success).toBe(true);
  });

  it("rejects invalid character references", () => {
    const scene = buildValidScene();
    scene.cast[0].characterId = "missing";
    expect(validateSceneBlueprint(scene, theWoundsWeKeep, expected).success).toBe(false);
  });

  it("rejects invalid location references", () => {
    const scene = buildValidScene();
    scene.location.locationId = "missing";
    expect(validateSceneBlueprint(scene, theWoundsWeKeep, expected).success).toBe(false);
  });

  it("rejects dialogue intent outside the scene cast", () => {
    const scene = buildValidScene();
    scene.dialogueIntent.push({
      characterId: "char_pip",
      objective: "Explain something",
      subtext: "Not actually present",
      mustCommunicate: [],
      mustNotReveal: []
    });
    expect(validateSceneBlueprint(scene, theWoundsWeKeep, expected).success).toBe(false);
  });

  it("rejects duplicate scene cast", () => {
    const scene = buildValidScene();
    scene.cast.push({ ...scene.cast[0] });
    expect(validateSceneBlueprint(scene, theWoundsWeKeep, expected).success).toBe(false);
  });

  it("protects immutable canon", () => {
    const scene = buildValidScene();
    scene.proposedCanonChanges = [{
      type: "CHANGE_MUTABLE_FACT",
      explanation: "Change established healing law.",
      targetCanonId: "fact_transfer",
      proposedValue: "Orin can erase injuries."
    }];
    const result = validateSceneBlueprint(scene, theWoundsWeKeep, expected);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.code === "IMMUTABLE_CANON_PROTECTED")).toBe(true);
    }
  });

  it("requires explicit mystery target for resolution", () => {
    const scene = buildValidScene();
    scene.proposedCanonChanges = [{
      type: "RESOLVE_MYSTERY",
      explanation: "Resolve a mystery.",
      targetCanonId: null,
      proposedValue: "Answer"
    }];
    expect(validateSceneBlueprint(scene, theWoundsWeKeep, expected).success).toBe(false);
  });

  it("preserves the source beat required story change", () => {
    const scene = buildValidScene();
    scene.storyPurpose.requiredStoryChange = "Something else happens.";
    const result = validateSceneBlueprint(scene, theWoundsWeKeep, expected);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.code === "STORY_CHANGE_DRIFT")).toBe(true);
    }
  });

  it("requires source-beat characters unless omission is documented", () => {
    const scene = buildValidScene();
    removeMaraFromActiveScene(scene);
    const result = validateSceneBlueprint(scene, theWoundsWeKeep, expected);
    expect(result.success).toBe(false);
  });

  it("allows a source-beat omission only when the assumption names the omitted character", () => {
    const scene = buildValidScene();
    removeMaraFromActiveScene(scene);
    scene.confidence.assumptions = ["char_mara is unconscious before the active scene interaction begins."];
    const result = validateSceneBlueprint(scene, theWoundsWeKeep, expected);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown required canon fact", () => {
    const scene = buildValidScene();
    scene.continuityChecks.requiredCanonFactIds.push("missing_fact");
    expect(validateSceneBlueprint(scene, theWoundsWeKeep, expected).success).toBe(false);
  });

  it("does not mutate the supplied SeriesBlueprint while validating proposals", () => {
    const series = structuredClone(theWoundsWeKeep);
    const before = JSON.stringify(series.canon);
    validateSceneBlueprint(buildValidScene(), series, expected);
    expect(JSON.stringify(series.canon)).toBe(before);
  });
});
