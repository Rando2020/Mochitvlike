import type {CharacterAbility,CharacterPerformanceBible,CanonPerformanceContext,AbilityVariant} from "./types";

export function isAbilityAvailable(ability:CharacterAbility,context:CanonPerformanceContext){
 return ability.continuity.unlockedAtCanonId===null||context.activeCanonFactIds.includes(ability.continuity.unlockedAtCanonId);
}
export function getAvailableAbilities(bible:CharacterPerformanceBible,context:CanonPerformanceContext){
 return bible.abilityKit.filter(a=>isAbilityAvailable(a,context));
}
function variantAvailable(v:AbilityVariant,context:CanonPerformanceContext){
 return v.canonicalFrom.type==="EPISODE_NUMBER"
  ?v.canonicalFrom.episodeNumber<=context.episodeNumber
  :context.activeCanonFactIds.includes(v.canonicalFrom.canonFactId);
}
export function getCanonicalAbilityVariant(ability:CharacterAbility,context:CanonPerformanceContext){
 const available=ability.variants.filter(v=>variantAvailable(v,context)).sort((a,b)=>a.version-b.version);
 return available.at(-1)??null;
}
export function getCurrentDeclaredVariant(ability:CharacterAbility){
 return ability.variants.find(v=>v.id===ability.continuity.currentVariantId)??null;
}
