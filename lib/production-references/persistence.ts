import type {SupabaseClient} from "@supabase/supabase-js";
import type {ProductionReferenceRecord,ReferenceProvenance} from "./types";

const fallbackProvenance=(source:string):ReferenceProvenance=>({source:source as ReferenceProvenance["source"],creatorNameOrId:null,licenseIdOrDescription:null,sourceUrlOrRecord:null,permissions:{productionUse:null,commercialUse:null,modelConditioning:null,redistribution:null},projectSpecific:null,notes:null});
export function mapProductionReferenceRow(row:any):ProductionReferenceRecord{
 const provenance=(row.provenance&&typeof row.provenance==="object"?row.provenance:fallbackProvenance(row.source)) as ReferenceProvenance;
 return{
  id:row.id,seriesId:row.series_id,type:row.type,status:row.status,source:row.source,storagePath:row.storage_path,assetUrl:row.asset_url,checksum:row.checksum,
  benchmarkOnly:row.benchmark_only,creatorApproved:row.creator_approved,approved:row.approved,characterId:row.character_id,abilityId:row.ability_id,locationId:row.location_id,propId:row.prop_id,
  referenceRole:row.reference_role,abilitySlot:row.ability_slot,modelCompatibility:Array.isArray(row.model_compatibility)?row.model_compatibility:[],provenance,
  visualMetadata:{width:row.width,height:row.height,mimeType:row.mime_type,notes:row.notes},version:row.version,replacesReferenceId:row.replaces_reference_id,
  createdAt:row.created_at,updatedAt:row.updated_at,archivedAt:row.archived_at
 };
}
const select="id,series_id,type,status,source,storage_path,asset_url,checksum,benchmark_only,creator_approved,approved,character_id,ability_id,location_id,prop_id,reference_role,ability_slot,model_compatibility,provenance,width,height,mime_type,notes,version,replaces_reference_id,created_at,updated_at,archived_at";
export async function listProductionReferenceRecords(supabase:SupabaseClient,userId:string,seriesId:string){
 const {data,error}=await supabase.from("production_reference_assets").select(select).eq("creator_id",userId).eq("series_id",seriesId).order("created_at",{ascending:false});
 if(error)throw new Error("PRODUCTION_REFERENCE_READ_FAILED");return(data??[]).map(mapProductionReferenceRow);
}
export async function getProductionReferenceRecord(supabase:SupabaseClient,userId:string,seriesId:string,referenceId:string){
 const {data,error}=await supabase.from("production_reference_assets").select(select).eq("creator_id",userId).eq("series_id",seriesId).eq("id",referenceId).maybeSingle();
 if(error||!data)throw new Error("PRODUCTION_REFERENCE_NOT_FOUND");return mapProductionReferenceRow(data);
}
