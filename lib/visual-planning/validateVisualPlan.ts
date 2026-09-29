import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SceneScript } from "@/lib/scripts/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { VisualPlanSchema } from "./schema";
import type { VisualPlan } from "./types";

export type VisualPlanValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type VisualPlanValidationResult =
  | { success: true; plan: VisualPlan }
  | { success: false; errors: VisualPlanValidationIssue[] };

function push(
  errors: VisualPlanValidationIssue[],
  path: string,
  code: string,
  message: string
) {
  errors.push({ path, code, message });
}

export function validateVisualPlan(
  input: unknown,
  series: SeriesBlueprint,
  scene: SceneBlueprint,
  script: SceneScript,
  expected: {
    planId: string;
    seriesId: string;
    sceneId: string;
    scriptId: string;
    version: number;
  }
): VisualPlanValidationResult {
  const parsed = VisualPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: "STRUCTURAL_VALIDATION_ERROR",
        message: issue.message
      }))
    };
  }

  const plan = parsed.data as VisualPlan;
  const errors: VisualPlanValidationIssue[] = [];

  if (plan.id !== expected.planId) push(errors, "id", "PLAN_ID_MISMATCH", "Plan ID must match the server-assigned ID.");
  if (plan.seriesId !== expected.seriesId) push(errors, "seriesId", "SERIES_ID_MISMATCH", "Series ID does not match.");
  if (plan.sceneId !== expected.sceneId) push(errors, "sceneId", "SCENE_ID_MISMATCH", "Scene ID does not match.");
  if (plan.scriptId !== expected.scriptId) push(errors, "scriptId", "SCRIPT_ID_MISMATCH", "Script ID does not match.");
  if (plan.version !== expected.version) push(errors, "version", "PLAN_VERSION_MISMATCH", "Plan version does not match.");

  const beatIds = plan.visualBeats.map((beat) => beat.id);
  if (new Set(beatIds).size !== beatIds.length) {
    push(errors, "visualBeats", "DUPLICATE_VISUAL_BEAT_IDS", "Visual beat IDs must be unique.");
  }

  const scriptBlockIds = new Set(script.blocks.map((block) => block.id));
  const covered = new Set<string>();

  plan.visualBeats.forEach((beat, index) => {
    beat.sourceScriptBlockIds.forEach((blockId, blockIndex) => {
      if (!scriptBlockIds.has(blockId)) {
        push(errors, `visualBeats.${index}.sourceScriptBlockIds.${blockIndex}`, "INVALID_SOURCE_BLOCK", "Visual beat references an unknown script block.");
      } else {
        covered.add(blockId);
      }
    });
    if (beat.estimatedDurationSeconds <= 0) {
      push(errors, `visualBeats.${index}.estimatedDurationSeconds`, "INVALID_VISUAL_BEAT_DURATION", "Visual beat duration must be positive.");
    }
  });

  for (const block of script.blocks) {
    if (block.type === "ACTION" || block.type === "DIALOGUE" || block.type === "REACTION") {
      if (!covered.has(block.id)) {
        push(errors, "visualBeats", "SCRIPT_BLOCK_NOT_COVERED", `Meaningful script block '${block.id}' is not represented.`);
      }
    }
  }

  const sceneCast = new Set(scene.cast.map((member) => member.characterId));
  const validateCharacter = (characterId: string, path: string) => {
    if (!sceneCast.has(characterId)) {
      push(errors, path, "INVALID_CHARACTER_REFERENCE", "Visual plan references a character outside the scene.");
    }
  };

  plan.continuity.characters.forEach((item, index) => validateCharacter(item.characterId, `continuity.characters.${index}.characterId`));
  plan.staging.characterPositions.forEach((item, index) => validateCharacter(item.characterId, `staging.characterPositions.${index}.characterId`));
  plan.visualBeats.forEach((beat, index) => {
    beat.focalCharacterIds.forEach((id, sub) => validateCharacter(id, `visualBeats.${index}.focalCharacterIds.${sub}`));
    beat.supportingCharacterIds.forEach((id, sub) => validateCharacter(id, `visualBeats.${index}.supportingCharacterIds.${sub}`));
  });

  const expectedLocation = scene.location.locationId;
  if (plan.continuity.locationId !== expectedLocation) {
    push(errors, "continuity.locationId", "LOCATION_MISMATCH", "Visual plan must preserve the Scene location.");
  }
  if (
    plan.continuity.locationId !== null &&
    !series.world.locations.some((location) => location.id === plan.continuity.locationId)
  ) {
    push(errors, "continuity.locationId", "INVALID_LOCATION_REFERENCE", "Visual plan location does not exist.");
  }

  const totalDuration = plan.visualBeats.reduce((sum, beat) => sum + beat.estimatedDurationSeconds, 0);
  const minDuration = script.estimatedDurationSeconds * 0.8;
  const maxDuration = script.estimatedDurationSeconds * 1.2;
  if (totalDuration < minDuration) push(errors, "visualBeats", "DURATION_BELOW_TOLERANCE", "Visual plan is more than 20% shorter than the script.");
  if (totalDuration > maxDuration) push(errors, "visualBeats", "DURATION_ABOVE_TOLERANCE", "Visual plan is more than 20% longer than the script.");

  const mysteryIds = new Set(series.canon.mysteries.map((mystery) => mystery.id));
  const protectedInPlan = new Set(plan.continuityChecks.protectedMysteries);
  plan.continuityChecks.protectedMysteries.forEach((id, index) => {
    if (!mysteryIds.has(id)) {
      push(errors, `continuityChecks.protectedMysteries.${index}`, "INVALID_MYSTERY_REFERENCE", "Protected mystery does not exist.");
    }
  });

  for (const protectedId of script.continuityVerification.protectedMysteriesPreserved) {
    if (!protectedInPlan.has(protectedId)) {
      push(errors, "continuityChecks.protectedMysteries", "PROTECTED_MYSTERY_NOT_VERIFIED", "A protected script mystery is missing from visual continuity checks.");
    }
  }

  const canonIds = new Set(series.canon.facts.map((fact) => fact.id));
  for (const factId of plan.continuity.protectedCanon) {
    if (!canonIds.has(factId)) {
      push(errors, "continuity.protectedCanon", "INVALID_CANON_REFERENCE", "Protected canon reference does not exist.");
    }
  }

  if (errors.length) return { success: false, errors };
  return { success: true, plan };
}
