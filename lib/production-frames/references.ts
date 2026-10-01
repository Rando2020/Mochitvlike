import type {ReferenceSheetSlot} from "@/lib/character-performance/types";
import {provenanceProblems} from "@/lib/production-references/validation";
import type {ProductionReferenceAsset} from "./types";

export class ProductionReferenceError extends Error{
 constructor(public readonly code:"MISSING_PRODUCTION_REFERENCE"|"UNAPPROVED_PRODUCTION_REFERENCE"|"BENCHMARK_REFERENCE_FORBIDDEN",message:string){super(`${code}: ${message}`);}
}
export function assertProductionReference(reference:ProductionReferenceAsset,modelId:string){
 if(reference.benchmarkOnly)throw new ProductionReferenceError("BENCHMARK_REFERENCE_FORBIDDEN","Benchmark-only references cannot be used for production frames.");
 if(reference.status&&reference.status!=="APPROVED")throw new ProductionReferenceError("UNAPPROVED_PRODUCTION_REFERENCE","Production reference lifecycle state is not APPROVED.");
 if(!reference.approved||!reference.creatorApproved)throw new ProductionReferenceError("UNAPPROVED_PRODUCTION_REFERENCE","Production references must be creator-approved.");
 if(reference.provenance&&provenanceProblems(reference.provenance).length)throw new ProductionReferenceError("UNAPPROVED_PRODUCTION_REFERENCE","Production reference rights are incomplete.");
 if(reference.modelCompatibility.length&&!reference.modelCompatibility.includes(modelId))throw new ProductionReferenceError("UNAPPROVED_PRODUCTION_REFERENCE","Reference is not approved for the selected model.");
 return structuredClone(reference);
}
export function requireCharacterReferences(references:readonly ProductionReferenceAsset[],characterIds:readonly string[],modelId:string){
 return characterIds.map(characterId=>{
  const reference=references.find(r=>r.type==="CHARACTER"&&r.characterId===characterId&&(!r.referenceRole||r.referenceRole==="PRIMARY_IDENTITY"));
  if(!reference)throw new ProductionReferenceError("MISSING_PRODUCTION_REFERENCE",`Missing approved CHARACTER reference for ${characterId}.`);
  return assertProductionReference(reference,modelId);
 });
}
export function requireAbilityReferences(references:readonly ProductionReferenceAsset[],abilityId:string,modelId:string,requiredSlots:readonly ReferenceSheetSlot[]=[]){
 const matches=references.filter(r=>r.type==="ABILITY"&&r.abilityId===abilityId);
 if(!matches.length)throw new ProductionReferenceError("MISSING_PRODUCTION_REFERENCE",`Missing approved ABILITY reference for ${abilityId}.`);
 const approved=matches.map(r=>assertProductionReference(r,modelId));
 if(requiredSlots.length){
  const slots=new Set(approved.map(r=>r.abilitySlot).filter(Boolean));
  const missing=requiredSlots.filter(slot=>!slots.has(slot));
  if(missing.length)throw new ProductionReferenceError("MISSING_PRODUCTION_REFERENCE",`Missing approved ABILITY reference slots for ${abilityId}: ${missing.join(", ")}.`);
 }
 return approved;
}
