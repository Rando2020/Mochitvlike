import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { validateSceneScript } from "../validateSceneScript";
import { buildValidScript } from "./fixtures";

const scene = buildValidScene();
const expected = {
  scriptId: "33333333-3333-4333-8333-333333333333",
  sceneId: scene.id,
  seriesId: scene.seriesId,
  version: 1
};

function validate(script = buildValidScript()) {
  return validateSceneScript(script, theWoundsWeKeep, scene, expected);
}

describe("SceneScript validation", () => {
  it("accepts a valid structured script", () => expect(validate().success).toBe(true));

  it("rejects invalid dialogue cast references", () => {
    const script = buildValidScript();
    const dialogue = script.blocks.find((block) => block.type === "DIALOGUE");
    if (dialogue?.type === "DIALOGUE") dialogue.characterId = "char_pip";
    expect(validate(script).success).toBe(false);
  });

  it("rejects invalid reaction references", () => {
    const script = buildValidScript();
    const reaction = script.blocks.find((block) => block.type === "REACTION");
    if (reaction?.type === "REACTION") reaction.characterId = "char_pip";
    expect(validate(script).success).toBe(false);
  });

  it("rejects duplicate block IDs", () => {
    const script = buildValidScript();
    script.blocks[1].id = script.blocks[0].id;
    expect(validate(script).success).toBe(false);
  });

  it("requires an ACTION block", () => {
    const script = buildValidScript();
    script.blocks = script.blocks.filter((block) => block.type !== "ACTION");
    expect(validate(script).success).toBe(false);
  });

  it("rejects empty dialogue structurally", () => {
    const script = buildValidScript();
    const dialogue = script.blocks.find((block) => block.type === "DIALOGUE");
    if (dialogue?.type === "DIALOGUE") dialogue.text = "";
    expect(validate(script).success).toBe(false);
  });

  it("rejects duration shorter than five seconds", () => {
    expect(validate(buildValidScript({ estimatedDurationSeconds: 4 })).success).toBe(false);
  });

  it("rejects duration longer than the episode", () => {
    expect(validate(buildValidScript({ estimatedDurationSeconds: 100 })).success).toBe(false);
  });

  it("requires the story change to be achieved", () => {
    const script = buildValidScript();
    script.endingStateVerification.requiredStoryChangeAchieved = false;
    expect(validate(script).success).toBe(false);
  });

  it("rejects reported continuity contradictions", () => {
    const script = buildValidScript();
    script.continuityVerification.contradictionsDetected = ["Orin erases the wound."];
    expect(validate(script).success).toBe(false);
  });

  it("rejects direct forbidden disclosures", () => {
    const script = buildValidScript();
    const orin = script.blocks.find((block) => block.type === "DIALOGUE" && block.characterId === "char_orin");
    if (orin?.type === "DIALOGUE") orin.text = "The full nature of Burden Healing.";
    expect(validate(script).success).toBe(false);
  });

  it("requires dialogue for characters with dialogue intent", () => {
    const script = buildValidScript();
    script.blocks = script.blocks.filter(
      (block) => !(block.type === "DIALOGUE" && block.characterId === "char_mara")
    );
    expect(validate(script).success).toBe(false);
  });

  it("rejects unknown canon verification references", () => {
    const script = buildValidScript();
    script.continuityVerification.requiredCanonFactIdsUsed = ["missing"];
    expect(validate(script).success).toBe(false);
  });

  it("rejects unknown protected mystery references", () => {
    const script = buildValidScript();
    script.continuityVerification.protectedMysteriesPreserved = ["missing"];
    expect(validate(script).success).toBe(false);
  });

  it("rejects a mismatched version", () => {
    expect(validate(buildValidScript({ version: 2 })).success).toBe(false);
  });

  it("rejects a mismatched scene", () => {
    expect(validate(buildValidScript({ sceneId: "44444444-4444-4444-8444-444444444444" })).success).toBe(false);
  });

  it("rejects a mismatched series", () => {
    expect(validate(buildValidScript({ seriesId: "44444444-4444-4444-8444-444444444444" })).success).toBe(false);
  });
});
