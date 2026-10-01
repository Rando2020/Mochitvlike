import type {VisualEvaluationResult,VisualEvaluationSummary} from "./types";

export const PRODUCTION_SCORE_WEIGHTS={
 characterIdentity:.20,
 multiCharacterIdentity:.15,
 poseAdherence:.15,
 styleConsistency:.15,
 cameraComposition:.10,
 backgroundContinuity:.05,
 anatomy:.05,
 promptComprehension:.05,
 adapterCompatibility:.05,
 speedCost:.05
} as const;

type WeightedKey=keyof typeof PRODUCTION_SCORE_WEIGHTS;
function average(values:(number|null)[]){const xs=values.filter((x):x is number=>x!==null);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;}
export function normalizeScore(value:number){return Math.max(0,Math.min(1,value));}

export function summarizeModelEvaluation(modelId:string,results:readonly VisualEvaluationResult[],totalScenarios:number):VisualEvaluationSummary{
 const modelResults=results.filter(r=>r.modelId===modelId);
 const dimensionScores={} as Record<WeightedKey,number|null>;
 for(const key of Object.keys(PRODUCTION_SCORE_WEIGHTS) as WeightedKey[])dimensionScores[key]=average(modelResults.map(r=>r.metrics[key]));
 let weighted=0,weightUsed=0;
 for(const key of Object.keys(PRODUCTION_SCORE_WEIGHTS) as WeightedKey[]){
   const value=dimensionScores[key];if(value===null)continue;
   const weight=PRODUCTION_SCORE_WEIGHTS[key];weighted+=normalizeScore(value)*weight;weightUsed+=weight;
 }
 const warnings:string[]=[];
 if(modelResults.length<totalScenarios)warnings.push("Benchmark is incomplete; aggregate score is provisional.");
 if(weightUsed<1)warnings.push("One or more weighted dimensions are missing.");
 return{modelId,aggregateScore:weightUsed?weighted/weightUsed:null,dimensionScores,completedScenarios:modelResults.length,totalScenarios,evidenceWarnings:warnings};
}

export function humanReviewSnapshot(results:readonly VisualEvaluationResult[]){
 return results.map(r=>({modelId:r.modelId,scenarioId:r.scenarioId,...r.humanReview}));
}
