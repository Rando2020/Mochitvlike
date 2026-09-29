import type { SeriesBlueprint } from "@/lib/series/types";
import { SceneBlueprintSchema } from "./schema";
import type { SceneBlueprint } from "./types";

export type SceneValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type SceneValidationResult =
  | { success: true; scene: SceneBlueprint }
  | { success: false; errors: SceneValidationIssue[] };

function add(
  errors: SceneValidationIssue[],
  path: string,
  code: string,
  message: string
) {
  errors.push({ path, code, message });
}

export function validateSceneBlueprint(
  input: unknown,
  series: SeriesBlueprint,
  expected: {
    sceneId: string;
    seriesId: string;
    beatId: string;
  }
): SceneValidationResult {
  const parsed = SceneBlueprintSchema.safeParse(input);

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

  const scene = parsed.data as SceneBlueprint;
  const errors: SceneValidationIssue[] = [];

  if (scene.id !== expected.sceneId) {
    add(errors, "id", "SCENE_ID_MISMATCH", "Scene ID must match the server-assigned scene.");
  }

  if (scene.seriesId !== expected.seriesId) {
    add(errors, "seriesId", "SERIES_ID_MISMATCH", "Series ID does not match the owning series.");
  }

  if (scene.sourceBeatId !== expected.beatId) {
    add(errors, "sourceBeatId", "SOURCE_BEAT_MISMATCH", "Source beat does not match the requested beat.");
  }

  const beat = series.episodeOne.beats.find((item) => item.id === expected.beatId);
  if (!beat) {
    add(errors, "sourceBeatId", "UNKNOWN_BEAT", "Source beat does not exist.");
    return { success: false, errors };
  }

  if (!scene.storyPurpose.requiredStoryChange.trim()) {
    add(errors, "storyPurpose.requiredStoryChange", "MISSING_STORY_CHANGE", "Required story change must be explicit.");
  }

  if (scene.storyPurpose.requiredStoryChange !== beat.storyChange) {
    add(errors, "storyPurpose.requiredStoryChange", "STORY_CHANGE_DRIFT", "Scene must preserve the source beat's required story change.");
  }

  const validCast = new Set(series.cast.map((member) => member.id));
  const sceneCastIds = scene.cast.map((member) => member.characterId);
  const sceneCast = new Set(sceneCastIds);

  if (sceneCast.size !== sceneCastIds.length) {
    add(errors, "cast", "DUPLICATE_SCENE_CAST", "Scene cast cannot contain duplicate characters.");
  }

  for (const [index, member] of scene.cast.entries()) {
    if (!validCast.has(member.characterId)) {
      add(errors, `cast.${index}.characterId`, "INVALID_CHARACTER_REFERENCE", "Scene cast references an unknown character.");
    }
  }

  for (const characterId of beat.involvedCharacterIds) {
    if (!sceneCast.has(characterId)) {
      const documented = scene.confidence.assumptions.some((assumption) =>
        assumption.includes(characterId)
      );

      if (!documented) {
        add(
          errors,
          "cast",
          "REQUIRED_BEAT_CHARACTER_OMITTED",
          `Source-beat character '${characterId}' is missing without a documented assumption.`
        );
      }
    }
  }

  const validateCharacterRef = (characterId: string, path: string) => {
    if (!validCast.has(characterId)) {
      add(errors, path, "INVALID_CHARACTER_REFERENCE", "Referenced character does not exist.");
    }
  };

  scene.openingState.emotionalStateByCharacter.forEach((entry, index) =>
    validateCharacterRef(entry.characterId, `openingState.emotionalStateByCharacter.${index}.characterId`)
  );

  scene.openingState.knownFactsByCharacter.forEach((entry, index) => {
    validateCharacterRef(entry.characterId, `openingState.knownFactsByCharacter.${index}.characterId`);

    const canonIds = new Set(series.canon.facts.map((fact) => fact.id));
    entry.knownCanonFactIds.forEach((factId, factIndex) => {
      if (!canonIds.has(factId)) {
        add(
          errors,
          `openingState.knownFactsByCharacter.${index}.knownCanonFactIds.${factIndex}`,
          "INVALID_CANON_REFERENCE",
          "Known fact reference does not exist."
        );
      }
    });
  });

  scene.dialogueIntent.forEach((entry, index) => {
    if (!sceneCast.has(entry.characterId)) {
      add(
        errors,
        `dialogueIntent.${index}.characterId`,
        "DIALOGUE_CHARACTER_OUTSIDE_SCENE",
        "Dialogue intent may reference scene cast only."
      );
    }
  });

  if (
    scene.location.locationId !== null &&
    !series.world.locations.some((location) => location.id === scene.location.locationId)
  ) {
    add(errors, "location.locationId", "INVALID_LOCATION_REFERENCE", "Scene location does not exist.");
  }

  scene.endingState.characterChanges.forEach((entry, index) =>
    validateCharacterRef(entry.characterId, `endingState.characterChanges.${index}.characterId`)
  );

  scene.endingState.knowledgeChanges.forEach((entry, index) =>
    validateCharacterRef(entry.characterId, `endingState.knowledgeChanges.${index}.characterId`)
  );

  scene.endingState.relationshipChanges.forEach((entry, index) => {
    validateCharacterRef(entry.fromCharacterId, `endingState.relationshipChanges.${index}.fromCharacterId`);
    validateCharacterRef(entry.toCharacterId, `endingState.relationshipChanges.${index}.toCharacterId`);
  });

  const facts = new Map(series.canon.facts.map((fact) => [fact.id, fact]));
  const mysteries = new Set(series.canon.mysteries.map((mystery) => mystery.id));

  scene.proposedCanonChanges.forEach((change, index) => {
    if (change.type === "CHANGE_MUTABLE_FACT") {
      const fact = change.targetCanonId ? facts.get(change.targetCanonId) : undefined;
      if (!fact) {
        add(errors, `proposedCanonChanges.${index}.targetCanonId`, "INVALID_CANON_REFERENCE", "Mutable fact proposal must target an existing fact.");
      } else if (!fact.mutable) {
        add(errors, `proposedCanonChanges.${index}`, "IMMUTABLE_CANON_PROTECTED", "Immutable canon cannot be changed.");
      }
    }

    if (change.type === "RESOLVE_MYSTERY") {
      if (!change.targetCanonId || !mysteries.has(change.targetCanonId)) {
        add(errors, `proposedCanonChanges.${index}.targetCanonId`, "INVALID_MYSTERY_REFERENCE", "Mystery resolution must explicitly target an existing mystery.");
      }
    }

    if ((change.type === "ADD_FACT" || change.type === "ADD_MYSTERY") && change.targetCanonId !== null) {
      add(errors, `proposedCanonChanges.${index}.targetCanonId`, "UNEXPECTED_CANON_TARGET", "New canon proposals must not target existing canon.");
    }
  });

  const canonIds = new Set(series.canon.facts.map((fact) => fact.id));
  scene.continuityChecks.requiredCanonFactIds.forEach((factId, index) => {
    if (!canonIds.has(factId)) {
      add(errors, `continuityChecks.requiredCanonFactIds.${index}`, "INVALID_CANON_REFERENCE", "Continuity fact reference does not exist.");
    }
  });

  if (errors.length) {
    return { success: false, errors };
  }

  return { success: true, scene };
}
