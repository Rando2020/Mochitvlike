import type {SeriesBlueprint} from "@/lib/series/types";
import type {CharacterPerformanceBible,ReferenceSheetSlot} from "@/lib/character-performance/types";
import type {ProductionReferenceRecord,ReferenceProvenance} from "./types";

export function provenanceProblems(p:ReferenceProvenance){
 const problems:string[]=[];
 if(!p.source)problems.push("SOURCE_REQUIRED");
 if(!p.creatorNameOrId?.trim())problems.push("CREATOR_RECORD_REQUIRED");
 if(!p.licenseIdOrDescription?.trim()&&!p.sourceUrlOrRecord?.trim())problems.push("RIGHTS_RECORD_REQUIRED");
 if(p.permissions.productionUse!==true)problems.push("PRODUCTION_USE_PERMISSION_REQUIRED");
 if(p.permissions.commercialUse!==true)problems.push("COMMERCIAL_USE_PERMISSION_REQUIRED");
 if(p.permissions.modelConditioning!==true)problems.push("MODEL_CONDITIONING_PERMISSION_REQUIRED");
 if(p.source==="SYNTHETIC"&&p.projectSpecific!==true)problems.push("SYNTHETIC_PROJECT_SPECIFIC_REQUIRED");
 return problems;
}
export function validateReferenceAssociation(record:ProductionReferenceRecord,series:SeriesBlueprint,bibles:readonly CharacterPerformanceBible[]){
 const problems:string[]=[];
 if(record.type==="CHARACTER"){
  if(!record.characterId||!series.cast.some(c=>c.id===record.characterId))problems.push("INVALID_CHARACTER_ASSOCIATION");
  if(!record.referenceRole)problems.push("CHARACTER_REFERENCE_ROLE_REQUIRED");
 }else if(record.characterId)problems.push("CHARACTER_ASSOCIATION_TYPE_MISMATCH");
 if(record.type==="ABILITY"){
  if(!record.characterId||!record.abilityId||!record.abilitySlot)problems.push("ABILITY_ASSOCIATION_REQUIRED");
  else{
   const bible=bibles.find(b=>b.characterId===record.characterId);
   const ability=bible?.abilityKit.find(a=>a.id===record.abilityId);
   if(!ability)problems.push("INVALID_ABILITY_ASSOCIATION");
   else if(!ability.referenceSheet.some(slot=>slot.slot===record.abilitySlot))problems.push("INVALID_ABILITY_SLOT");
  }
 }else if(record.abilityId||record.abilitySlot)problems.push("ABILITY_ASSOCIATION_TYPE_MISMATCH");
 if(record.type==="LOCATION"){
  if(!record.locationId||!series.world.locations.some(l=>l.id===record.locationId))problems.push("INVALID_LOCATION_ASSOCIATION");
 }else if(record.locationId)problems.push("LOCATION_ASSOCIATION_TYPE_MISMATCH");
 if(record.type==="PROP"&&!record.propId?.trim())problems.push("PROP_SCOPE_REQUIRED");
 else if(record.type!=="PROP"&&record.propId)problems.push("PROP_ASSOCIATION_TYPE_MISMATCH");
 return problems;
}
export function approvalProblems(record:ProductionReferenceRecord,series:SeriesBlueprint,bibles:readonly CharacterPerformanceBible[]){
 const problems:string[]=[];
 if(record.benchmarkOnly)problems.push("BENCHMARK_REFERENCE_FORBIDDEN");
 if(!record.storagePath||!record.checksum||!record.visualMetadata.width||!record.visualMetadata.height)problems.push("REFERENCE_TECHNICAL_VALIDITY_REQUIRED");
 problems.push(...provenanceProblems(record.provenance));
 problems.push(...validateReferenceAssociation(record,series,bibles));
 return [...new Set(problems)];
}
export function isApprovedProductionReference(record:ProductionReferenceRecord){
 return record.status==="APPROVED"&&record.approved&&record.creatorApproved&&!record.benchmarkOnly&&provenanceProblems(record.provenance).length===0;
}
export function requiredAbilitySlots(bible:CharacterPerformanceBible,abilityId:string):ReferenceSheetSlot[]{
 const ability=bible.abilityKit.find(a=>a.id===abilityId);return ability?.referenceSheet.filter(s=>s.required).map(s=>s.slot)??[];
}
