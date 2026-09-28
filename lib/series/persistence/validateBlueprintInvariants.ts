import type { SeriesBlueprint } from "@/lib/series/types";

function unique(values: string[]) {
  return new Set(values).size === values.length;
}

export function hasValidSeriesBlueprintInvariants(blueprint: SeriesBlueprint) {
  const protagonists = blueprint.cast.filter((member) => member.role === "PROTAGONIST");
  if (protagonists.length !== 1) return false;

  const castIds = blueprint.cast.map((member) => member.id);
  const locationIds = blueprint.world.locations.map((location) => location.id);
  const factionIds = blueprint.world.factions.map((faction) => faction.id);
  const beatIds = blueprint.episodeOne.beats.map((beat) => beat.id);

  if (!unique(castIds) || !unique(locationIds) || !unique(factionIds) || !unique(beatIds)) {
    return false;
  }

  const cast = new Set(castIds);
  const locations = new Set(locationIds);
  const factions = new Set(factionIds);

  if (
    blueprint.relationships.some(
      (relationship) =>
        relationship.fromCharacterId === relationship.toCharacterId ||
        !cast.has(relationship.fromCharacterId) ||
        !cast.has(relationship.toCharacterId)
    )
  ) {
    return false;
  }

  if (
    blueprint.season.characterArcs.some((arc) => !cast.has(arc.characterId)) ||
    !unique(blueprint.season.characterArcs.map((arc) => arc.characterId))
  ) {
    return false;
  }

  if (
    blueprint.episodeOne.beats.some(
      (beat) =>
        beat.involvedCharacterIds.some((characterId) => !cast.has(characterId)) ||
        (beat.locationId !== null && !locations.has(beat.locationId)) ||
        !beat.storyChange.trim()
    )
  ) {
    return false;
  }

  for (const fact of blueprint.canon.facts) {
    if (fact.subjectType === "CHARACTER" && (!fact.subjectId || !cast.has(fact.subjectId))) {
      return false;
    }

    if (fact.subjectType === "LOCATION" && (!fact.subjectId || !locations.has(fact.subjectId))) {
      return false;
    }

    if (fact.subjectType === "FACTION" && (!fact.subjectId || !factions.has(fact.subjectId))) {
      return false;
    }

    if ((fact.subjectType === "WORLD" || fact.subjectType === "STORY") && fact.subjectId !== null) {
      return false;
    }
  }

  const power = blueprint.world.powerSystem;
  if (
    power.exists &&
    (!power.name || !power.summary || power.rules.length === 0 || power.costs.length === 0 || power.limitations.length === 0)
  ) {
    return false;
  }

  if (
    !power.exists &&
    (power.name !== null ||
      power.summary !== null ||
      power.rules.length > 0 ||
      power.costs.length > 0 ||
      power.limitations.length > 0)
  ) {
    return false;
  }

  if (
    blueprint.clarification.needed !== (blueprint.clarification.questions.length > 0) ||
    new Set(blueprint.studioFeatures.map((feature) => feature.type)).size !== blueprint.studioFeatures.length
  ) {
    return false;
  }

  const firstTwo = blueprint.episodeOne.beats.slice(0, 2);
  if (!firstTwo.some((beat) => beat.type === "HOOK" || beat.type === "SETUP")) {
    return false;
  }

  const ending = blueprint.episodeOne.beats.at(-1);
  if (!ending || !["REVEAL", "CLIFFHANGER", "EMOTIONAL", "ACTION", "CONFLICT"].includes(ending.type)) {
    return false;
  }

  return true;
}
