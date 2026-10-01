import type {ProductionReferenceAsset} from "./types";

export class ProductionReferenceError extends Error{
 constructor(public readonly code:"MISSING_PRODUCTION_REFERENCE"|"UNAPPROVED_PRODUCTION_REFERENCE"|"BENCHMARK_REFERENCE_FORBIDDEN",message:string){super(`${code}: ${message}`);}
}
export function assertProductionReference(reference:ProductionReferenceAsset,modelId:string){
 if(reference.benchmarkOnly)throw new ProductionReferenceError("BENCHMARK_REFERENCE_FORBIDDEN","Benchmark-only references cannot be used for production frames.");
 if(!reference.approved||!reference.creatorApproved)throw new ProductionReferenceError("UNAPPROVED_PRODUCTION_REFERENCE","Production references must be creator-approved.");
 if(reference.modelCompatibility.length&&!reference.modelCompatibility.includes(modelId))throw new ProductionReferenceError("UNAPPROVED_PRODUCTION_REFERENCE","Reference is not approved for the selected model.");
 return structuredClone(reference);
}
export function requireCharacterReferences(references:readonly ProductionReferenceAsset[],characterIds:readonly string[],modelId:string){
 return characterIds.map(characterId=>{
  const reference=references.find(r=>r.type==="CHARACTER"&&r.characterId===characterId);
  if(!reference)throw new ProductionReferenceError("MISSING_PRODUCTION_REFERENCE",`Missing approved CHARACTER reference for ${characterId}.`);
  return assertProductionReference(reference,modelId);
 });
}
export function requireAbilityReferences(references:readonly ProductionReferenceAsset[],abilityId:string,modelId:string){
 const matches=references.filter(r=>r.type==="ABILITY"&&r.abilityId===abilityId);
 if(!matches.length)throw new ProductionReferenceError("MISSING_PRODUCTION_REFERENCE",`Missing approved ABILITY reference for ${abilityId}.`);
 return matches.map(r=>assertProductionReference(r,modelId));
}
