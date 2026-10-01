import {randomUUID} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {CharacterPerformanceBible,ReferenceSheetSlot} from "@/lib/character-performance/types";
import type {CharacterReferenceRole,ProductionReferenceRecord,ReferenceProvenance} from "./types";
import type {ProductionReferenceType} from "@/lib/production-frames/types";
import {inspectProductionReferenceImage} from "./image";
import {uploadProductionReference} from "./storage";
import {approvalProblems} from "./validation";
import {getProductionReferenceRecord} from "./persistence";

export type CreateReferenceInput={
 type:ProductionReferenceType;source:ReferenceProvenance["source"];characterId?:string|null;abilityId?:string|null;locationId?:string|null;propId?:string|null;
 referenceRole?:CharacterReferenceRole|null;abilitySlot?:ReferenceSheetSlot|null;modelCompatibility?:string[];provenance:ReferenceProvenance;notes?:string|null;
 replacesReferenceId?:string|null;benchmarkOnly?:boolean;
};

export async function createProductionReference(input:{
 admin:SupabaseClient;userId:string;seriesId:string;series:SeriesBlueprint;performanceBibles:CharacterPerformanceBible[];file:{bytes:Uint8Array;mimeType:string};metadata:CreateReferenceInput;
}){
 const inspection=inspectProductionReferenceImage(input.file.bytes,input.file.mimeType);
 const id=randomUUID();
 let version=1;
 if(input.metadata.replacesReferenceId){
  const replaced=await getProductionReferenceRecord(input.admin,input.userId,input.seriesId,input.metadata.replacesReferenceId);
  version=replaced.version+1;
 }
 const storage=await uploadProductionReference(input.admin,{creatorId:input.userId,seriesId:input.seriesId,referenceId:id,checksum:inspection.checksum,extension:inspection.extension,bytes:input.file.bytes,mimeType:inspection.mimeType});
 const provisional={
  id,seriesId:input.seriesId,type:input.metadata.type,status:"REVIEW_REQUIRED",source:input.metadata.source,storagePath:storage.storagePath,assetUrl:storage.assetUrl,checksum:inspection.checksum,
  benchmarkOnly:Boolean(input.metadata.benchmarkOnly),creatorApproved:false,approved:false,characterId:input.metadata.characterId??null,abilityId:input.metadata.abilityId??null,
  locationId:input.metadata.locationId??null,propId:input.metadata.propId??null,referenceRole:input.metadata.referenceRole??null,abilitySlot:input.metadata.abilitySlot??null,
  modelCompatibility:input.metadata.modelCompatibility??[],provenance:input.metadata.provenance,visualMetadata:{width:inspection.width,height:inspection.height,mimeType:inspection.mimeType,notes:input.metadata.notes??null},
  version,replacesReferenceId:input.metadata.replacesReferenceId??null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),archivedAt:null
 } satisfies ProductionReferenceRecord;
 const associationProblems=approvalProblems({...provisional,benchmarkOnly:false},input.series,input.performanceBibles).filter(p=>!p.includes("PERMISSION")&&!["RIGHTS_RECORD_REQUIRED","CREATOR_RECORD_REQUIRED","SYNTHETIC_PROJECT_SPECIFIC_REQUIRED"].includes(p));
 if(associationProblems.length){await input.admin.storage.from("production-references").remove([storage.storagePath]);throw new Error(associationProblems[0]);}
 const status=approvalProblems(provisional,input.series,input.performanceBibles).length?"UPLOADED":"REVIEW_REQUIRED";
 const {error}=await input.admin.from("production_reference_assets").insert({
  id,creator_id:input.userId,series_id:input.seriesId,type:provisional.type,asset_url:storage.assetUrl,storage_path:storage.storagePath,checksum:inspection.checksum,source:provisional.source,
  approved:false,benchmark_only:provisional.benchmarkOnly,creator_approved:false,character_id:provisional.characterId,ability_id:provisional.abilityId,location_id:provisional.locationId,prop_id:provisional.propId,
  reference_role:provisional.referenceRole,ability_slot:provisional.abilitySlot,model_compatibility:provisional.modelCompatibility,provenance:provisional.provenance,width:inspection.width,height:inspection.height,mime_type:inspection.mimeType,
  notes:provisional.visualMetadata.notes,version,replaces_reference_id:provisional.replacesReferenceId,technical_valid:true,status
 });
 if(error){await input.admin.storage.from("production-references").remove([storage.storagePath]);throw new Error("PRODUCTION_REFERENCE_PERSISTENCE_FAILED");}
 return{id,status,checksum:inspection.checksum,width:inspection.width,height:inspection.height,mimeType:inspection.mimeType};
}

export async function approveProductionReference(input:{admin:SupabaseClient;userId:string;seriesId:string;referenceId:string;series:SeriesBlueprint;performanceBibles:CharacterPerformanceBible[]}){
 const record=await getProductionReferenceRecord(input.admin,input.userId,input.seriesId,input.referenceId);
 const problems=approvalProblems(record,input.series,input.performanceBibles);if(problems.length)throw new Error(problems[0]);
 const {error}=await input.admin.from("production_reference_assets").update({status:"APPROVED",approved:true,creator_approved:true}).eq("id",record.id).eq("creator_id",input.userId).eq("series_id",input.seriesId);
 if(error)throw new Error(error.code==="23505"?"REFERENCE_APPROVAL_CONFLICT":"PRODUCTION_REFERENCE_APPROVAL_FAILED");
 return{...record,status:"APPROVED" as const,approved:true,creatorApproved:true};
}
export async function transitionProductionReference(input:{admin:SupabaseClient;userId:string;seriesId:string;referenceId:string;status:"REJECTED"|"ARCHIVED"}){
 const record=await getProductionReferenceRecord(input.admin,input.userId,input.seriesId,input.referenceId);
 const payload=input.status==="ARCHIVED"?{status:"ARCHIVED",approved:false,creator_approved:record.creatorApproved,archived_at:new Date().toISOString()}:{status:"REJECTED",approved:false,creator_approved:false};
 const {error}=await input.admin.from("production_reference_assets").update(payload).eq("id",record.id).eq("creator_id",input.userId).eq("series_id",input.seriesId);
 if(error)throw new Error("PRODUCTION_REFERENCE_TRANSITION_FAILED");return{...record,status:input.status,approved:false};
}
