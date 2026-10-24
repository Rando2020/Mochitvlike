import type {CharacterPerformanceBible} from "@/lib/character-performance/types";
import type {CastMember} from "@/lib/series/types";
import {currentReferenceBinding} from "@/lib/character-direction/reference-binding";
import type {AbilityProductionReadiness,CharacterProductionReadiness,ProductionReferenceRecord} from "./types";
import {isApprovedProductionReference,requiredAbilitySlots} from "./validation";

export function getCharacterProductionReadiness(characterId:string,references:readonly ProductionReferenceRecord[],member?:CastMember):CharacterProductionReadiness{
 const related=references.filter(r=>r.type==="CHARACTER"&&r.characterId===characterId&&r.referenceRole==="PRIMARY_IDENTITY"&&!r.benchmarkOnly);
 if(related.some(isApprovedProductionReference))return "READY";
 // A creator-approved FULL_BODY or TURNAROUND can be the identity for this
 // specific visual revision without changing its historical source role.
 // Match the exact binding receipt, not merely the reference's role/status.
 const binding=member?.id===characterId?currentReferenceBinding(member):null;
 if(binding){
  const bound=references.find(r=>r.id===binding.referenceId);
  if(bound&&bound.type==="CHARACTER"&&bound.characterId===characterId&&
    (bound.referenceRole==="FULL_BODY"||bound.referenceRole==="TURNAROUND")&&
    bound.referenceRole===binding.sourceRole&&bound.checksum===binding.referenceChecksum&&
    bound.version===binding.referenceVersion&&isApprovedProductionReference(bound)&&!bound.archivedAt)
    return "READY";
 }
 if(related.some(r=>r.status==="UPLOADED"||r.status==="REVIEW_REQUIRED"))return "REFERENCE_REVIEW_REQUIRED";
 // The current revision can also have a pending full-body/turnaround candidate,
 // but it must still pass explicit rights approval and revision binding.
 const pending=references.some(r=>r.type==="CHARACTER"&&r.characterId===characterId&&
   (r.referenceRole==="FULL_BODY"||r.referenceRole==="TURNAROUND")&&!r.benchmarkOnly&&
   (r.status==="UPLOADED"||r.status==="REVIEW_REQUIRED"));
 if(pending)return "REFERENCE_REVIEW_REQUIRED";
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
