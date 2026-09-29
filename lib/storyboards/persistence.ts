import type {SupabaseClient} from "@supabase/supabase-js";
import {StoryboardBlueprintSchema} from "./schema";
import type {StoryboardBlueprint,StoryboardPanelState,StoryboardStatus} from "./types";

export class StoryboardPersistenceError extends Error{
 constructor(public readonly code:"STORYBOARD_NOT_FOUND"|"STORYBOARD_PERSISTENCE_FAILED"|"CORRUPT_STORYBOARD",message:string,public readonly cause?:unknown){super(message);this.name="StoryboardPersistenceError";}
}
function parseBlueprint(value:unknown):StoryboardBlueprint{
 const parsed=StoryboardBlueprintSchema.safeParse(value);
 if(!parsed.success)throw new StoryboardPersistenceError("CORRUPT_STORYBOARD","Stored storyboard failed validation.");
 return parsed.data as StoryboardBlueprint;
}
export async function getLatestStoryboard(supabase:SupabaseClient,userId:string,visualPlanId:string){
 const {data,error}=await supabase.from("storyboards").select("id,series_id,scene_id,script_id,visual_plan_id,creator_id,version,status,blueprint,created_at,updated_at,archived_at")
  .eq("visual_plan_id",visualPlanId).eq("creator_id",userId).order("version",{ascending:false}).limit(1).maybeSingle();
 if(error)throw new StoryboardPersistenceError("STORYBOARD_PERSISTENCE_FAILED","Unable to read storyboard.",error);
 if(!data)return null;
 return {...data,blueprint:parseBlueprint(data.blueprint)} as {id:string;series_id:string;scene_id:string;script_id:string;visual_plan_id:string;creator_id:string;version:number;status:StoryboardStatus;blueprint:StoryboardBlueprint;created_at:string;updated_at:string;archived_at:string|null};
}
export async function getStoryboard(supabase:SupabaseClient,userId:string,storyboardId:string){
 const {data,error}=await supabase.from("storyboards").select("id,series_id,scene_id,script_id,visual_plan_id,creator_id,version,status,blueprint,created_at,updated_at,archived_at")
  .eq("id",storyboardId).eq("creator_id",userId).maybeSingle();
 if(error)throw new StoryboardPersistenceError("STORYBOARD_PERSISTENCE_FAILED","Unable to read storyboard.",error);
 if(!data)throw new StoryboardPersistenceError("STORYBOARD_NOT_FOUND","Storyboard was not found.");
 return {...data,blueprint:parseBlueprint(data.blueprint)} as {id:string;series_id:string;scene_id:string;script_id:string;visual_plan_id:string;creator_id:string;version:number;status:StoryboardStatus;blueprint:StoryboardBlueprint;created_at:string;updated_at:string;archived_at:string|null};
}
export async function getPanelStates(supabase:SupabaseClient,userId:string,storyboardId:string):Promise<StoryboardPanelState[]>{
 const {data,error}=await supabase.from("storyboard_panel_generations").select("panel_id,status,asset_url,storage_path,width,height,mime_type,retry_count,sanitized_error_code")
  .eq("storyboard_id",storyboardId).eq("creator_id",userId);
 if(error)throw new StoryboardPersistenceError("STORYBOARD_PERSISTENCE_FAILED","Unable to read panel states.",error);
 return(data??[]).map(row=>({panelId:row.panel_id,status:row.status,
  asset:row.asset_url&&row.storage_path&&row.width&&row.height&&row.mime_type?{url:row.asset_url,storagePath:row.storage_path,width:row.width,height:row.height,mimeType:row.mime_type}:null,
  errorCode:row.sanitized_error_code,retryCount:row.retry_count}));
}
export function materializeStoryboard(blueprint:StoryboardBlueprint,states:StoryboardPanelState[]):StoryboardBlueprint{
 const byId=new Map(states.map(s=>[s.panelId,s]));
 return{...blueprint,panels:blueprint.panels.map(p=>{const state=byId.get(p.id);return state?{...p,generationStatus:state.status,asset:state.asset}:p;})};
}
