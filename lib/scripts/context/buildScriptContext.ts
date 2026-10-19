import { compileCharacterDirection } from "@/lib/character-direction/compile";
import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import type { ScriptContext } from "../types";

export function buildScriptContext(input: {
  seriesId: string;
  sceneId: string;
  version: number;
  series: SeriesBlueprint;
  scene: SceneBlueprint;
}): ScriptContext {
  const castIds = new Set(input.scene.cast.map((member) => member.characterId));

  const cast = input.series.cast
    .filter((member) => castIds.has(member.id))
    .map((member) => ({
      id: member.id,
      name: member.name,
      personalityTraits: member.personalityTraits,
      communicationStyle: member.characterSheetSeed.communicationStyle,
      personality: member.characterSheetSeed.personality,
      relationshipToProtagonist: member.relationshipToProtagonist,
      ...(member.generationDirection ? { creatorDirection: compileCharacterDirection(member.generationDirection) } : {})
    }));

  const requiredCanon = new Set(input.scene.continuityChecks.requiredCanonFactIds);
  const relevantCanonFacts = input.series.canon.facts.filter(
    (fact) => requiredCanon.has(fact.id) || (fact.subjectType === "CHARACTER" && !!fact.subjectId && castIds.has(fact.subjectId))
  );

  const protectedQuestions = new Set(input.scene.continuityChecks.unresolvedQuestionsProtected);
  const protectedMysteries = input.series.canon.mysteries.filter(
    (mystery) => protectedQuestions.has(mystery.question) || protectedQuestions.has(mystery.id)
  );

  const beatCount = Math.max(1, input.series.episodeOne.beats.length);
  const average = Math.max(5, Math.round(input.series.season.format.episodeLengthSeconds / beatCount));
  const weight = input.scene.actionIntent.requiredActions.length + input.scene.dialogueIntent.length;
  const estimatedTargetSeconds = Math.min(
    input.series.season.format.episodeLengthSeconds,
    Math.max(5, average + Math.min(12, weight * 2))
  );

  return {
    seriesId: input.seriesId,
    sceneId: input.sceneId,
    version: input.version,
    episodeDurationSeconds: input.series.season.format.episodeLengthSeconds,
    estimatedTargetSeconds,
    scene: input.scene,
    cast,
    relevantCanonFacts,
    protectedMysteries
  };
}
