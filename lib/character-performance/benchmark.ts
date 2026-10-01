import type {CharacterPerformanceBible,AbilityConsistencyScenario} from "./types";
import {deterministicScenarioSeed} from "./id";
import {getCanonicalAbilityVariant} from "./canon";

export function buildAbilityConsistencyScenarios(bible:CharacterPerformanceBible,abilityId:string):AbilityConsistencyScenario[]{
 const ability=bible.abilityKit.find(a=>a.id===abilityId);if(!ability)throw new Error("ABILITY_NOT_FOUND");
 const context={episodeNumber:2,activeCanonFactIds:[ability.continuity.unlockedAtCanonId].filter((x):x is string=>!!x)};
 const variant=getCanonicalAbilityVariant(ability,context);if(!variant)throw new Error("ABILITY_VARIANT_NOT_AVAILABLE");
 const preserve=[
  ability.identity.name,
  ability.visualSignature.silhouette,
  ability.visualSignature.energyShape,
  ...ability.visualSignature.palette,
  ...ability.visualSignature.vfxMotifs
 ];
 const refs=ability.referenceSheet.map(r=>r.assetKey);
 const defs=[
  ["ability-front","Front angle","front three-quarter","neutral low-key lighting",[],2],
  ["ability-side","Side angle","strict profile","neutral low-key lighting",[],2],
  ["ability-wide","Wide shot","wide environmental","neutral low-key lighting",[],2],
  ["ability-lighting","Different lighting","front three-quarter","cool moonlight with warm rim",[],2],
  ["ability-companion","Alongside another character","medium two-shot","neutral low-key lighting",["char_mara"],2],
  ["ability-later-episode","Different episode","high three-quarter","rainy overcast daylight",[],4]
 ] as const;
 return defs.map(([suffix,title,cameraAngle,lighting,withCharacterIds,episodeNumber])=>{
  const id=bible.characterId+"|"+ability.id+"|"+suffix;
  return{id:"ability_consistency_"+deterministicScenarioSeed(id).toString(16),category:"ABILITY_CONSISTENCY",characterId:bible.characterId,abilityId:ability.id,variantId:variant.id,title,cameraAngle,lighting,withCharacterIds:[...withCharacterIds],episodeNumber,promptContract:{mustPreserve:preserve,mayVary:["camera angle","shot size","lighting","background composition","secondary character placement"],referenceAssetKeys:refs},seed:deterministicScenarioSeed(id)};
 });
}
