import type {VisualEvaluationResult} from "./types";
import {VISUAL_BENCHMARK_SCENARIOS} from "./scenarios";
import {summarizeModelEvaluation} from "./scoring";

export function buildVisualEvaluationReport(modelIds:readonly string[],results:readonly VisualEvaluationResult[]){
 return{
  generatedFrom:"visual-production-benchmark-v1",
  scenarioCount:VISUAL_BENCHMARK_SCENARIOS.length,
  summaries:modelIds.map(id=>summarizeModelEvaluation(id,results,VISUAL_BENCHMARK_SCENARIOS.length)),
  principle:"Do not select a production model solely from an aggregate score. Review licensing, character consistency, structural adherence, adapter compatibility, cost, and raw artifacts separately.",
  noAutomaticWinner:true
 };
}
