import type { SeriesBlueprint } from "@/lib/series/types";

export function selectProtagonist(blueprint: SeriesBlueprint) {
  return blueprint.cast.find((member) => member.role === "PROTAGONIST") ?? blueprint.cast[0];
}

export function selectPrimaryFeatures(blueprint: SeriesBlueprint) {
  return blueprint.studioFeatures.filter((feature) => feature.priority === "PRIMARY");
}

export function selectSecondaryFeatures(blueprint: SeriesBlueprint) {
  return blueprint.studioFeatures.filter((feature) => feature.priority === "SECONDARY");
}

export function selectCastByIds(blueprint: SeriesBlueprint, ids: string[]) {
  const wanted = new Set(ids);
  return blueprint.cast.filter((member) => wanted.has(member.id));
}

export function selectLocation(blueprint: SeriesBlueprint, id: string | null) {
  if (!id) return null;
  return blueprint.world.locations.find((location) => location.id === id) ?? null;
}

export function episodeProgress(total: number, completed: number) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}
