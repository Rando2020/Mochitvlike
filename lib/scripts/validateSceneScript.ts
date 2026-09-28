import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { SceneScriptSchema } from "./schema";
import type { SceneScript } from "./types";

export type ScriptValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ScriptValidationResult =
  | { success: true; script: SceneScript }
  | { success: false; errors: ScriptValidationIssue[] };

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function push(
  errors: ScriptValidationIssue[],
  path: string,
  code: string,
  message: string
) {
  errors.push({ path, code, message });
}

const PRODUCTION_DIRECTION_PATTERNS = [
  /camera (?:pans?|tilts?|zooms?|tracks?)/i,
  /close[- ]?up/i,
  /wide shot/i,
  /medium shot/i,
  /lens/i,
  /lighting setup/i,
  /render prompt/i,
  /video prompt/i
];

export function validateSceneScript(
  input: unknown,
  series: SeriesBlueprint,
  scene: SceneBlueprint,
  expected: {
    scriptId: string;
    sceneId: string;
    seriesId: string;
    version: number;
  }
): ScriptValidationResult {
  const parsed = SceneScriptSchema.safeParse(input);
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

  const script = parsed.data as SceneScript;
  const errors: ScriptValidationIssue[] = [];

  if (script.id !== expected.scriptId) push(errors, "id", "SCRIPT_ID_MISMATCH", "Script ID must match the server-assigned ID.");
  if (script.sceneId !== expected.sceneId) push(errors, "sceneId", "SCENE_ID_MISMATCH", "Script scene does not match its parent.");
  if (script.seriesId !== expected.seriesId) push(errors, "seriesId", "SERIES_ID_MISMATCH", "Script series does not match its parent.");
  if (script.version !== expected.version) push(errors, "version", "SCRIPT_VERSION_MISMATCH", "Script version is invalid.");

  const maxDuration = series.season.format.episodeLengthSeconds;
  if (script.estimatedDurationSeconds < 5 || script.estimatedDurationSeconds > maxDuration) {
    push(errors, "estimatedDurationSeconds", "INVALID_DURATION", "Script duration falls outside the Episode format.");
  }

  const sceneCast = new Set(scene.cast.map((member) => member.characterId));
  const blockIds = script.blocks.map((block) => block.id);
  if (new Set(blockIds).size !== blockIds.length) {
    push(errors, "blocks", "DUPLICATE_BLOCK_IDS", "Script block IDs must be unique.");
  }

  if (!script.blocks.some((block) => block.type === "ACTION")) {
    push(errors, "blocks", "ACTION_BLOCK_REQUIRED", "Script must include at least one action block.");
  }

  const representedDialogue = new Set<string>();
  let combinedDialogue = "";

  script.blocks.forEach((block, index) => {
    const visibleText =
      block.type === "ACTION" || block.type === "REACTION" || block.type === "DIALOGUE"
        ? block.text
        : block.purpose;

    if (PRODUCTION_DIRECTION_PATTERNS.some((pattern) => pattern.test(visibleText))) {
      push(errors, `blocks.${index}`, "PRODUCTION_DIRECTION_FORBIDDEN", "Script contains visual-production direction instead of dramatic writing.");
    }

    if (block.type === "DIALOGUE") {
      if (!sceneCast.has(block.characterId)) {
        push(errors, `blocks.${index}.characterId`, "INVALID_DIALOGUE_CHARACTER", "Dialogue references a character outside the scene.");
      }
      if (!block.text.trim()) {
        push(errors, `blocks.${index}.text`, "EMPTY_DIALOGUE", "Dialogue must not be empty.");
      }
      representedDialogue.add(block.characterId);
      combinedDialogue += " " + normalize(block.text);
    }

    if (block.type === "REACTION" && !sceneCast.has(block.characterId)) {
      push(errors, `blocks.${index}.characterId`, "INVALID_REACTION_CHARACTER", "Reaction references a character outside the scene.");
    }
  });

  for (const intent of scene.dialogueIntent) {
    if ((intent.mustCommunicate.length > 0 || intent.objective.trim()) && !representedDialogue.has(intent.characterId)) {
      push(errors, "blocks", "REQUIRED_DIALOGUE_CHARACTER_MISSING", "A character with required dialogue intent has no dialogue block.");
    }

    for (const forbidden of intent.mustNotReveal) {
      const normalized = normalize(forbidden);
      if (normalized.length >= 8 && combinedDialogue.includes(normalized)) {
        push(errors, "blocks", "FORBIDDEN_REVEAL", "Dialogue directly reveals a protected concept.");
      }
    }
  }

  if (!script.endingStateVerification.requiredStoryChangeAchieved) {
    push(errors, "endingStateVerification.requiredStoryChangeAchieved", "STORY_CHANGE_NOT_ACHIEVED", "The required story change must be achieved.");
  }

  if (script.continuityVerification.contradictionsDetected.length > 0) {
    push(errors, "continuityVerification.contradictionsDetected", "CONTINUITY_CONTRADICTION", "Scripts with detected contradictions cannot be persisted.");
  }

  const validCanon = new Set(series.canon.facts.map((fact) => fact.id));
  const usedCanon = new Set(script.continuityVerification.requiredCanonFactIdsUsed);

  for (const factId of usedCanon) {
    if (!validCanon.has(factId)) {
      push(errors, "continuityVerification.requiredCanonFactIdsUsed", "INVALID_CANON_REFERENCE", "Script verification references unknown canon.");
    }
  }

  for (const requiredId of scene.continuityChecks.requiredCanonFactIds) {
    if (!usedCanon.has(requiredId)) {
      push(errors, "continuityVerification.requiredCanonFactIdsUsed", "REQUIRED_CANON_NOT_VERIFIED", "A required scene canon fact is missing from script verification.");
    }
  }

  const mysteryById = new Map(series.canon.mysteries.map((mystery) => [mystery.id, mystery]));
  const preserved = new Set(script.continuityVerification.protectedMysteriesPreserved);

  for (const mysteryId of preserved) {
    if (!mysteryById.has(mysteryId)) {
      push(errors, "continuityVerification.protectedMysteriesPreserved", "INVALID_MYSTERY_REFERENCE", "Script verification references an unknown mystery.");
    }
  }

  for (const protectedValue of scene.continuityChecks.unresolvedQuestionsProtected) {
    const matching = series.canon.mysteries.find(
      (mystery) => mystery.id === protectedValue || mystery.question === protectedValue
    );
    if (matching && !preserved.has(matching.id)) {
      push(errors, "continuityVerification.protectedMysteriesPreserved", "PROTECTED_MYSTERY_NOT_VERIFIED", "A protected scene mystery is missing from script verification.");
    }
  }

  if (errors.length) return { success: false, errors };
  return { success: true, script };
}
