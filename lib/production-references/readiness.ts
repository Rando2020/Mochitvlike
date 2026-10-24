import type {CharacterPerformanceBible} from "@/lib/character-performance/types";
import type {AbilityProductionReadiness,CharacterProductionReadiness,ProductionReferenceRecord} from "./types";
import {isApprovedProductionReference,requiredAbilitySlots} from "./validation";

export type CharacterBindingSnapshot={
 referenceId:string;referenceChecksum:string;referenceVersion:number;
 sourceRole:"PRIMARY_IDENTITY"|"FULL_BODY"|"TURNAROUND";
};
export type CharacterBindingReadiness={binding:CharacterBindingSnapshot|null;bindingRequired:boolean};

// Pass the revision-checked binding from the server page as plain data.
// Never import the Node.js crypto-based revision hash into a client component.
export function getCharacterProductionReadiness(characterId:string,references:readonly ProductionReferenceRecord[],state?:CharacterBindingReadiness):CharacterProductionReadiness{
 const related=references.filter(r=>r.type==="CHARACTER"&&r.characterId===characterId&&!r.benchmarkOnly);
 const binding=state?.binding;
 if(binding){
  const source=related.find(r=>r.id===binding.referenceId);
  if(source&&source.referenceRole===binding.sourceRole&&source.checksum===binding.referenceChecksum&&
    source.version===binding.referenceVersion&&isApprovedProductionReference(source)&&!source.archivedAt)
    return "READY";
 }
 if(!state?.bindingRequired&&related.some(r=>r.referenceRole==="PRIMARY_IDENTITY"&&isApprovedProductionReference(r)))return "READY";
 // Approved source views still require a separate visual-revision binding.
 if(related.some(r=>["PRIMARY_IDENTITY","FULL_BODY","TURNAROUND"].includes(r.referenceRole??"")&&
    (isApprovedProductionReference(r)||r.status==="UPLOADED"||r.status==="REVIEW_REQUIRED")))return "REFERENCE_REVIEW_REQUIRED";
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
