import {createHash} from "node:crypto";
import {VISUAL_FOUNDATION_MODELS} from "../registry";
import {BENCHMARK_CHARACTERS,VISUAL_BENCHMARK_SCENARIOS} from "./scenarios";
import {buildOrinPerformanceBible} from "@/lib/character-performance/__tests__/fixtures";
import {buildAbilityConsistencyScenarios} from "@/lib/character-performance/benchmark";
import {getCanonicalAbilityVariant} from "@/lib/character-performance/canon";
import {materializeAbilityVariant} from "@/lib/character-performance/integration";

function hash(value:unknown){return createHash("sha256").update(JSON.stringify(value)).digest("hex");}

const ARTIFACT_FILENAMES:Record<string,string|null>={
  "animagine-xl-4.0":"animagine-xl-4.0.safetensors",
  "illustrious-xl-v2.0":"Illustrious-XL-v2.0.safetensors",
  "flux.1-schnell":null
};

export function buildVisualBenchmarkBridgeBundle(){
  const bible=buildOrinPerformanceBible();
  const ability=bible.abilityKit.find(a=>a.identity.name==="Burden Draw");
  if(!ability)throw new Error("BURDEN_DRAW_FIXTURE_MISSING");
  const context={episodeNumber:2,activeCanonFactIds:["fact_transfer"]};
  const variant=getCanonicalAbilityVariant(ability,context);
  if(!variant)throw new Error("BURDEN_DRAW_VARIANT_MISSING");
  const effective=materializeAbilityVariant(ability,variant);
  const performance={
    characterId:bible.characterId,
    bibleVersion:bible.version,
    movement:{
      posture:bible.movementIdentity.posture,
      silhouettePrinciples:[
        ...bible.movementIdentity.idle.silhouettePrinciples,
        ...bible.movementIdentity.walk.silhouettePrinciples,
        ...bible.movementIdentity.run.silhouettePrinciples
      ],
      physicalPrinciples:bible.movementIdentity.physicalPrinciples,
      mustNotDo:bible.movementIdentity.mustNotDo
    },
    ability:{
      id:ability.id,
      name:ability.identity.name,
      variantId:variant.id,
      variantVersion:variant.version,
      activation:ability.activation,
      choreography:effective.choreography,
      visualSignature:effective.visualSignature,
      vfx:ability.vfx,
      cameraLanguage:ability.cameraLanguage,
      mustNotDo:ability.rules.mustNotDo,
      referenceSheet:ability.referenceSheet
    }
  };
  return{
    schemaVersion:"visual-benchmark-bundle-v1",
    generatedFrom:{
      registry:"lib/visual-models/registry.ts",
      scenarios:"lib/visual-models/evaluation/scenarios.ts",
      performance:"lib/character-performance/__tests__/fixtures.ts",
      abilityBenchmark:"lib/character-performance/benchmark.ts"
    },
    models:VISUAL_FOUNDATION_MODELS.map(model=>({
      ...model,
      source:{...model.source,artifactFilename:ARTIFACT_FILENAMES[model.id]??null}
    })),
    characters:BENCHMARK_CHARACTERS,
    scenarios:VISUAL_BENCHMARK_SCENARIOS,
    performance,
    abilityScenarios:buildAbilityConsistencyScenarios(bible,ability.id),
    contractChecksum:hash({models:VISUAL_FOUNDATION_MODELS,characters:BENCHMARK_CHARACTERS,scenarios:VISUAL_BENCHMARK_SCENARIOS,performance,abilityScenarios:buildAbilityConsistencyScenarios(bible,ability.id)})
  };
}

export type VisualBenchmarkBridgeBundle=ReturnType<typeof buildVisualBenchmarkBridgeBundle>;
