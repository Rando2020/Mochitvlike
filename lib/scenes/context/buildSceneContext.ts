import { compileCharacterDirection } from "@/lib/character-direction/compile";
import type { SeriesBlueprint } from "@/lib/series/types";
import type { SceneContext } from "../types";

export class SceneContextError extends Error {
  constructor(public readonly code: "UNKNOWN_BEAT") {
    super(code);
  }
}

export function buildSceneContext(
  seriesId: string,
  blueprint: SeriesBlueprint,
  episodeKey: "episodeOne",
  beatId: string
): SceneContext {
  const sourceBeat = blueprint.episodeOne.beats.find((beat) => beat.id === beatId);
  if (!sourceBeat) {
    throw new SceneContextError("UNKNOWN_BEAT");
  }

  const involvedIds = new Set(sourceBeat.involvedCharacterIds);
  const involvedCast = blueprint.cast
    .filter((member) => involvedIds.has(member.id))
    .map(({ id, name, role, storyFunction, summary, want, need, internalConflict, relationshipToProtagonist, generationDirection }) => ({
      id,
      name,
      role,
      storyFunction,
      summary,
      want,
      need,
      internalConflict,
      relationshipToProtagonist,
      ...(generationDirection ? { creatorPersonalityGuidance: compileCharacterDirection(generationDirection).personality } : {})
    }));

  const relationships = blueprint.relationships.filter(
    (relationship) =>
      involvedIds.has(relationship.fromCharacterId) &&
      involvedIds.has(relationship.toCharacterId)
  );

  const location = sourceBeat.locationId
    ? blueprint.world.locations.find((item) => item.id === sourceBeat.locationId) ?? null
    : null;

  const canonFacts = blueprint.canon.facts.filter((fact) => {
    if (fact.subjectType === "STORY" || fact.subjectType === "WORLD") return true;
    if (fact.subjectType === "CHARACTER") return !!fact.subjectId && involvedIds.has(fact.subjectId);
    if (fact.subjectType === "LOCATION") return !!location && fact.subjectId === location.id;
    return false;
  });

  return {
    seriesId,
    episodeKey,
    sourceBeat,
    involvedCast,
    relationships,
    location,
    worldRules: blueprint.world.rules,
    powerSystem: blueprint.world.powerSystem.exists ? blueprint.world.powerSystem : null,
    canonFacts,
    mysteries: blueprint.canon.mysteries,
    season: {
      seasonQuestion: blueprint.season.seasonQuestion,
      beginning: blueprint.season.beginning,
      escalation: blueprint.season.escalation,
      midpoint: blueprint.season.midpoint,
      crisis: blueprint.season.crisis,
      finale: blueprint.season.finale
    }
  };
}
