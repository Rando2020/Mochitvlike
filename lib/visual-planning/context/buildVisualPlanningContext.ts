import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SceneScript } from "@/lib/scripts/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import type { VisualPlanningContext } from "../types";

export function buildVisualPlanningContext(input: {
  seriesId: string;
  sceneId: string;
  scriptId: string;
  version: number;
  series: SeriesBlueprint;
  scene: SceneBlueprint;
  script: SceneScript;
}): VisualPlanningContext {
  const castIds = new Set(input.scene.cast.map((member) => member.characterId));
  const cast = input.series.cast
    .filter((member) => castIds.has(member.id))
    .map((member) => ({
      id: member.id,
      name: member.name,
      visualConcept: member.visualConcept,
      visualDescription: member.characterSheetSeed.visualDescription,
      personalityTraits: member.personalityTraits
    }));

  const location = input.scene.location.locationId
    ? input.series.world.locations.find((item) => item.id === input.scene.location.locationId) ?? null
    : null;

  const protectedIds = new Set(input.script.continuityVerification.protectedMysteriesPreserved);
  const protectedQuestions = new Set(input.scene.continuityChecks.unresolvedQuestionsProtected);
  const protectedMysteries = input.series.canon.mysteries.filter(
    (mystery) => protectedIds.has(mystery.id) || protectedQuestions.has(mystery.id) || protectedQuestions.has(mystery.question)
  );

  return {
    seriesId: input.seriesId,
    sceneId: input.sceneId,
    scriptId: input.scriptId,
    version: input.version,
    scene: input.scene,
    script: input.script,
    creativeDNA: input.series.creativeDNA.visualStyle,
    location,
    cast,
    worldRules: input.series.world.rules,
    powerSystem: input.series.world.powerSystem.exists ? input.series.world.powerSystem : null,
    protectedMysteries
  };
}
