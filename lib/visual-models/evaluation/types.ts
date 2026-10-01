export type BenchmarkCategory="CHARACTER_IDENTITY"|"MULTI_CHARACTER"|"POSE_COMPOSITION"|"CONTINUITY"|"ANIME"|"MANGA";
export type BenchmarkCharacter={
  id:"kael"|"lyra"|"mira"|"vesper";
  name:string;
  appearance:string;
  costume:string;
  palette:string[];
};
export type VisualBenchmarkScenario={
  id:string;
  category:BenchmarkCategory;
  title:string;
  prompt:string;
  characterIds:string[];
  seed:number;
  references:string[];
  poseReference:string|null;
};
export type VisualEvaluationResult={
  modelId:string;
  scenarioId:string;
  seed:number;
  inputs:{prompt:string;references:string[];poseReference:string|null};
  metrics:{
    characterIdentity:number|null;
    multiCharacterIdentity:number|null;
    poseAdherence:number|null;
    styleConsistency:number|null;
    cameraComposition:number|null;
    backgroundContinuity:number|null;
    anatomy:number|null;
    promptComprehension:number|null;
    adapterCompatibility:number|null;
    speedCost:number|null;
    compositionSimilarity:number|null;
    referenceSimilarity:number|null;
    latencyMs:number|null;
    peakMemoryMb:number|null;
  };
  humanReview:{
    characterConsistency:number|null;
    styleConsistency:number|null;
    anatomy:number|null;
    productionUsability:number|null;
    notes:string[];
  };
  artifactRefs:string[];
};
export type VisualEvaluationSummary={
  modelId:string;
  aggregateScore:number|null;
  dimensionScores:Record<string,number|null>;
  completedScenarios:number;
  totalScenarios:number;
  evidenceWarnings:string[];
};
