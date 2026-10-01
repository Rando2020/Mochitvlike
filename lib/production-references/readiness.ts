import type {CharacterPerformanceBible} from "@/lib/character-performance/types";
import type {AbilityProductionReadiness,CharacterProductionReadiness,ProductionReferenceRecord} from "./types";
import {isApprovedProductionReference,requiredAbilitySlots} from "./validation";

export function getCharacterProductionReadiness(characterId:string,references:readonly ProductionReferenceRecord[]):CharacterProductionReadiness{
 const related=references.filter(r=>r.type==="CHARACTER"&&r.characterId===characterId&&r.referenceRole==="PRIMARY_IDENTITY"&&!r.benchmarkOnly);
 if(related.some(isApprovedProductionReference))return "READY";
 if(related.some(r=>r.status==="UPLOADED"||r.status==="REVIEW_REQUIRED"))return "REFERENCE_REVIEW_REQUIRED";
 return "MISSING_PRIMARY_CHARACTER_REFERENCE";
}
export function getAbilityProductionReadiness(characterId:string,abilityId:string,bible:CharacterPerformanceBible,references:readonly ProductionReferenceRecord[]):AbilityProductionReadiness{
 const slots=requiredAbilitySlots(bible,abilityId);if(!slots.length)return "MISSING_ABILITY_REFERENCE";
 const related=references.filter(r=>r.type==="ABILITY"&&r.characterId===characterId&&r.abilityId===abilityId&&!r.benchmarkOnly);
 const approved=new Set(related.filter(isApprovedProductionReference).map(r=>r.abilitySlot));
 if(slots.every(slot=>approved.has(slot)))return "READY";
 if(related.some(r=>r.status==="UPLOADED"||r.status==="REVIEW_REQUIRED"))return "REFERENCE_REVIEW_REQUIRED";
 return "MISSING_ABILITY_REFERENCE";
}
