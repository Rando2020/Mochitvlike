import {describe,expect,it} from "vitest";
import {BENCHMARK_CHARACTERS,VISUAL_BENCHMARK_SCENARIOS,scenariosByCategory} from "../scenarios";
import {buildVisualEvaluationReport} from "../report";
import {normalizeScore,PRODUCTION_SCORE_WEIGHTS,summarizeModelEvaluation,humanReviewSnapshot} from "../scoring";
import {VisualEvaluationResultSchema} from "../schema";
import type {VisualEvaluationResult} from "../types";

const prohibited=["naruto","goku","sailor moon","luffy","gojo","mikasa","totoro","pikachu"];
function result(overrides:Partial<VisualEvaluationResult>={}):VisualEvaluationResult{
 return{
  modelId:"model-a",scenarioId:VISUAL_BENCHMARK_SCENARIOS[0].id,seed:VISUAL_BENCHMARK_SCENARIOS[0].seed,
  inputs:{prompt:VISUAL_BENCHMARK_SCENARIOS[0].prompt,references:["artifact://ref"],poseReference:null},
  metrics:{characterIdentity:.8,multiCharacterIdentity:.7,poseAdherence:.75,styleConsistency:.9,cameraComposition:.8,backgroundContinuity:.7,anatomy:.8,promptComprehension:.9,adapterCompatibility:.9,speedCost:.6,compositionSimilarity:.8,referenceSimilarity:.82,latencyMs:1000,peakMemoryMb:12000},
  humanReview:{characterConsistency:.8,styleConsistency:.9,anatomy:.8,productionUsability:.85,notes:["reviewed"]},
  artifactRefs:["artifact://output"],
  ...overrides
 };
}

describe("Production benchmark",()=>{
 it("has approximately 30 or more scenarios",()=>expect(VISUAL_BENCHMARK_SCENARIOS.length).toBeGreaterThanOrEqual(30));
 it("scenario ids are unique",()=>expect(new Set(VISUAL_BENCHMARK_SCENARIOS.map(x=>x.id)).size).toBe(VISUAL_BENCHMARK_SCENARIOS.length));
 it("scenarios are deterministic",()=>expect(VISUAL_BENCHMARK_SCENARIOS).toEqual(VISUAL_BENCHMARK_SCENARIOS));
 it("seeds are deterministic and nonnegative",()=>expect(VISUAL_BENCHMARK_SCENARIOS.every(x=>Number.isInteger(x.seed)&&x.seed>=0)).toBe(true));
 it("uses four original benchmark characters",()=>expect(BENCHMARK_CHARACTERS.map(x=>x.id)).toEqual(["kael","lyra","mira","vesper"]));
 it("contains no named copyrighted benchmark characters",()=>{const text=JSON.stringify(VISUAL_BENCHMARK_SCENARIOS).toLowerCase();for(const name of prohibited)expect(text).not.toContain(name);});
 it("has character identity scenarios",()=>expect(scenariosByCategory("CHARACTER_IDENTITY").length).toBeGreaterThanOrEqual(6));
 it("has multi-character scenarios",()=>expect(scenariosByCategory("MULTI_CHARACTER").length).toBeGreaterThanOrEqual(5));
 it("has pose/composition scenarios",()=>expect(scenariosByCategory("POSE_COMPOSITION").length).toBeGreaterThanOrEqual(8));
 it("has environment continuity scenarios",()=>expect(scenariosByCategory("CONTINUITY").length).toBeGreaterThanOrEqual(5));
 it("has anime scenarios",()=>expect(scenariosByCategory("ANIME").length).toBeGreaterThanOrEqual(5));
 it("has manga scenarios",()=>expect(scenariosByCategory("MANGA").length).toBeGreaterThanOrEqual(6));
 it("all scenarios explicitly exclude franchise characters",()=>expect(VISUAL_BENCHMARK_SCENARIOS.every(x=>x.prompt.includes("No text, logos, copyrighted characters"))).toBe(true));
});

describe("Evaluation scoring",()=>{
 it("normalizes below zero",()=>expect(normalizeScore(-2)).toBe(0));
 it("normalizes above one",()=>expect(normalizeScore(2)).toBe(1));
 it("weights sum to one",()=>expect(Object.values(PRODUCTION_SCORE_WEIGHTS).reduce((a,b)=>a+b,0)).toBeCloseTo(1));
 it("calculates weighted score",()=>expect(summarizeModelEvaluation("model-a",[result()],1).aggregateScore).toBeGreaterThan(0));
 it("handles missing metric",()=>{const r=result();r.metrics.characterIdentity=null;const s=summarizeModelEvaluation("model-a",[r],1);expect(s.dimensionScores.characterIdentity).toBeNull();expect(s.evidenceWarnings).toContain("One or more weighted dimensions are missing.");});
 it("keeps human review separate",()=>expect(humanReviewSnapshot([result()])[0].productionUsability).toBe(.85));
 it("captures latency",()=>expect(VisualEvaluationResultSchema.parse(result()).metrics.latencyMs).toBe(1000));
 it("captures model artifact refs",()=>expect(VisualEvaluationResultSchema.parse(result()).artifactRefs).toEqual(["artifact://output"]));
 it("validates scores 0 to 1",()=>{const r=result();r.metrics.anatomy=2;expect(VisualEvaluationResultSchema.safeParse(r).success).toBe(false);});
 it("reports incomplete benchmark honestly",()=>expect(summarizeModelEvaluation("model-a",[result()],VISUAL_BENCHMARK_SCENARIOS.length).evidenceWarnings).toContain("Benchmark is incomplete; aggregate score is provisional."));
 it("report refuses an automatic winner",()=>expect(buildVisualEvaluationReport(["model-a"],[result()]).noAutomaticWinner).toBe(true));
});
