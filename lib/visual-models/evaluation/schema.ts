import {z} from "zod";
const score=z.number().min(0).max(1).nullable();
export const VisualEvaluationResultSchema=z.object({
 modelId:z.string().min(1),scenarioId:z.string().min(1),seed:z.number().int().nonnegative(),
 inputs:z.object({prompt:z.string().min(1),references:z.array(z.string()),poseReference:z.string().nullable()}).strict(),
 metrics:z.object({
  characterIdentity:score,multiCharacterIdentity:score,poseAdherence:score,styleConsistency:score,cameraComposition:score,backgroundContinuity:score,anatomy:score,promptComprehension:score,adapterCompatibility:score,speedCost:score,
  compositionSimilarity:score,referenceSimilarity:score,latencyMs:z.number().nonnegative().nullable(),peakMemoryMb:z.number().nonnegative().nullable()
 }).strict(),
 humanReview:z.object({characterConsistency:score,styleConsistency:score,anatomy:score,productionUsability:score,notes:z.array(z.string().max(1000))}).strict(),
 artifactRefs:z.array(z.string())
}).strict();
