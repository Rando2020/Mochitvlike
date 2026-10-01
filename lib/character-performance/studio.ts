import type {CharacterPerformanceBible,CanonPerformanceContext} from "./types";
import {getAvailableAbilities,getCanonicalAbilityVariant} from "./canon";
export function buildCharacterPerformanceStudioViewModel(bible:CharacterPerformanceBible,context:CanonPerformanceContext){
 return{
  tabs:["Overview","Appearance","Personality","Performance","Abilities"] as const,
  performance:{
   movementIdentity:bible.movementIdentity,
   actionGuide:bible.actionGuide,
   signatureActions:bible.actionGuide.signatureActions
  },
  abilities:bible.abilityKit.map(ability=>{
   const unlocked=getAvailableAbilities(bible,context).some(a=>a.id===ability.id);
   const variant=unlocked?getCanonicalAbilityVariant(ability,context):null;
   return{id:ability.id,name:ability.identity.name,classification:ability.identity.classification,concept:ability.concept.summary,palette:ability.visualSignature.palette,unlocked,currentVariant:variant?{id:variant.id,name:variant.name,version:variant.version}:null};
  })
 };
}
