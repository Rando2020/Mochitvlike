import type {SupabaseClient} from "@supabase/supabase-js";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {CharacterPerformanceBible} from "@/lib/character-performance/types";
import {validateCharacterPerformanceBible} from "@/lib/character-performance/validateCharacterPerformanceBible";
import {listProductionReferenceRecords} from "@/lib/production-references/persistence";
import {isApprovedProductionReference} from "@/lib/production-references/validation";
import type {PerformanceBinding} from "./compiler";
import type {ProductionFrameRecord,ProductionReferenceAsset,ProductionFrameStatus,ProductionFrameGenerationStatus} from "./types";

export async function getProductionReferences(supabase:SupabaseClient,userId:string,seriesId:string):Promise<ProductionReferenceAsset[]>{
 const records=await listProductionReferenceRecords(supabase,userId,seriesId);
 return records.filter(isApprovedProductionReference).map(r=>({
  id:r.id,type:r.type,assetUrl:r.assetUrl,checksum:r.checksum,source:r.source,approved:r.approved,benchmarkOnly:r.benchmarkOnly,creatorApproved:r.creatorApproved,
  characterId:r.characterId,abilityId:r.abilityId,modelCompatibility:r.modelCompatibility,status:r.status,storagePath:r.storagePath,referenceRole:r.referenceRole,
  abilitySlot:r.abilitySlot,locationId:r.locationId,propId:r.propId,provenance:r.provenance
 }));
}
export async function getPerformanceBibles(supabase:SupabaseClient,userId:string,seriesId:string,series:SeriesBlueprint):Promise<CharacterPerformanceBible[]>{
 const {data,error}=await supabase.from("character_performance_bibles").select("character_id,version,bible").eq("creator_id",userId).eq("series_id",seriesId);
 if(error)throw new Error("PERFORMANCE_BIBLE_READ_FAILED");
 const latest=new Map<string,{version:number;bible:unknown}>();
 for(const row of data??[]){const old=latest.get(row.character_id);if(!old||row.version>old.version)latest.set(row.character_id,{version:row.version,bible:row.bible});}
 return[...latest.values()].map(row=>{const validated=validateCharacterPerformanceBible(series,row.bible);if(!validated.success)throw new Error("CORRUPT_CHARACTER_PERFORMANCE_BIBLE");return validated.bible;});
}
export async function getPerformanceBindings(supabase:SupabaseClient,userId:string,storyboardId:string,panelId:string):Promise<PerformanceBinding[]>{
 const {data,error}=await supabase.from("production_frame_performance_bindings").select("character_id,action_pattern_id,signature_action_id,ability_id").eq("creator_id",userId).eq("storyboard_id",storyboardId).eq("storyboard_panel_id",panelId);
 if(error)throw new Error("PRODUCTION_FRAME_BINDINGS_READ_FAILED");
 return(data??[]).map(r=>({characterId:r.character_id,...(r.action_pattern_id?{actionPatternId:r.action_pattern_id}:{}),...(r.signature_action_id?{signatureActionId:r.signature_action_id}:{}),...(r.ability_id?{abilityId:r.ability_id}:{})}));
}
export async function getLatestProductionFrameForPanel(supabase:SupabaseClient,userId:string,panelId:string){
 const {data,error}=await supabase.from("production_frames").select("id,creator_id,storyboard_panel_id,version,status,selected_generation_id,development_visual,model_id,model_revision").eq("creator_id",userId).eq("storyboard_panel_id",panelId).order("version",{ascending:false}).limit(1).maybeSingle();
 if(error)throw new Error("PRODUCTION_FRAME_READ_FAILED");if(!data)return null;const generation=data.selected_generation_id?await getGeneration(supabase,userId,data.selected_generation_id):await getLatestGenerationForFrame(supabase,userId,data.id);return mapFrame(data,generation);
}
export async function getProductionFrame(supabase:SupabaseClient,userId:string,frameId:string){
 const {data,error}=await supabase.from("production_frames").select("id,creator_id,storyboard_panel_id,version,status,selected_generation_id,development_visual,model_id,model_revision,series_id,scene_id,script_id,visual_plan_id,storyboard_id").eq("creator_id",userId).eq("id",frameId).maybeSingle();
 if(error||!data)throw new Error("PRODUCTION_FRAME_NOT_FOUND");const generation=data.selected_generation_id?await getGeneration(supabase,userId,data.selected_generation_id):await getLatestGenerationForFrame(supabase,userId,data.id);
 return{...mapFrame(data,generation),seriesId:data.series_id,sceneId:data.scene_id,scriptId:data.script_id,visualPlanId:data.visual_plan_id,storyboardId:data.storyboard_id};
}
async function getGeneration(supabase:SupabaseClient,userId:string,id:string){const {data}=await supabase.from("production_frame_generations").select("id,status,output_url,width,height,mime_type,error_code,retry_count").eq("creator_id",userId).eq("id",id).maybeSingle();return data;}
async function getLatestGenerationForFrame(supabase:SupabaseClient,userId:string,frameId:string){const {data}=await supabase.from("production_frame_generations").select("id,status,output_url,width,height,mime_type,error_code,retry_count").eq("creator_id",userId).eq("production_frame_id",frameId).order("created_at",{ascending:false}).limit(1).maybeSingle();return data;}
function mapFrame(row:any,g:any):ProductionFrameRecord{return{id:row.id,creatorId:row.creator_id,storyboardPanelId:row.storyboard_panel_id,version:row.version,status:row.status as ProductionFrameStatus,selectedGenerationId:row.selected_generation_id,developmentVisual:row.development_visual,modelId:row.model_id,modelRevision:row.model_revision,generation:g?{id:g.id,status:g.status as ProductionFrameGenerationStatus,outputUrl:g.output_url,width:g.width,height:g.height,mimeType:g.mime_type,errorCode:g.error_code,retryCount:g.retry_count}:null};}
export async function getProductionFramesForStoryboard(supabase:SupabaseClient,userId:string,storyboardId:string){
 const {data,error}=await supabase.from("production_frames").select("id,storyboard_panel_id").eq("creator_id",userId).eq("storyboard_id",storyboardId).order("version",{ascending:false});if(error)throw new Error("PRODUCTION_FRAME_READ_FAILED");
 const seen=new Set<string>(),result:ProductionFrameRecord[]=[];for(const row of data??[]){if(seen.has(row.storyboard_panel_id))continue;seen.add(row.storyboard_panel_id);result.push(await getProductionFrame(supabase,userId,row.id));}return result;
}
