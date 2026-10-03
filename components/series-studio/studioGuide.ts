import type { SceneSummary } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";

// Saved scene plans are evidence of planning, never evidence of rendered media.
export function selectActiveScenes(blueprint: SeriesBlueprint, scenes: SceneSummary[]) {
  const beatIds = new Set(blueprint.episodeOne.beats.map((beat) => beat.id));
  const byBeat = new Map<string, SceneSummary>();
  for (const scene of scenes) {
    if (scene.status === "ARCHIVED" || !beatIds.has(scene.sourceBeatId)) continue;
    const previous = byBeat.get(scene.sourceBeatId);
    if (!previous || scene.updatedAt > previous.updatedAt ||
      (scene.updatedAt === previous.updatedAt && scene.id > previous.id)) {
      byBeat.set(scene.sourceBeatId, scene);
    }
  }
  return blueprint.episodeOne.beats.flatMap((beat) => {
    const scene = byBeat.get(beat.id);
    return scene ? [scene] : [];
  });
}

export function selectStudioNextStep(blueprint: SeriesBlueprint, scenes: SceneSummary[]) {
  const byBeat = new Map(selectActiveScenes(blueprint, scenes).map((scene) => [scene.sourceBeatId, scene]));
  for (const [index, beat] of blueprint.episodeOne.beats.entries()) {
    const scene = byBeat.get(beat.id);
    if (!scene || scene.status === "DRAFT") {
      return { kind: scene ? "CONTINUE" as const : "DEVELOP" as const, beat, number: index + 1 };
    }
  }
  return { kind: "REVIEW" as const };
}
