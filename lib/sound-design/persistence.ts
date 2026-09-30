import type {SupabaseClient} from "@supabase/supabase-js";
import {SoundDesignPlanSchema} from "./schema";
import type {SoundDesignPlan,SoundPlanStatus,SoundCueState,SoundAsset,SoundGenerationStatus} from "./types";

export class SoundPersistenceError extends Error{
 constructor(public readonly code:"SOUND_PLAN_NOT_FOUND"|"SOUND_PERSISTENCE_FAILED"|"CORRUPT_SOUND_PLAN",message:string,public readonly cause?:unknown){super(message);this.name="SoundPersistenceError";}
}
type PlanRow={id:string;series_id:string;episode_assembly_id:string;dialogue_plan_id:string|null;creator_id:string;version:number;status:SoundPlanStatus;plan:unknown;plan_schema_version:string;created_at:string;updated_at:string;archived_at:string|null};
function parsePlan(value:unknown){const p=SoundDesignPlanSchema.safeParse(value);if(!p.success)throw new SoundPersistenceError("CORRUPT_SOUND_PLAN","Stored SoundDesignPlan failed validation.");return p.data as SoundDesignPlan;}
const SELECT="id,series_id,episode_assembly_id,dialogue_plan_id,creator_id,version,status,plan,plan_schema_version,created_at,updated_at,archived_at";

export async function getSoundDesignPlan(supabase:SupabaseClient,userId:string,id:string){
 const{data,error}=await supabase.from("sound_design_plans").select(SELECT).eq("id",id).eq("creator_id",userId).maybeSingle();
 if(error)throw new SoundPersistenceError("SOUND_PERSISTENCE_FAILED","Unable to read SoundDesignPlan.",error);
 if(!data)throw new SoundPersistenceError("SOUND_PLAN_NOT_FOUND","SoundDesignPlan not found.");
 return{...(data as PlanRow),plan:parsePlan((data as PlanRow).plan)};
}
export async function getLatestSoundDesignPlan(supabase:SupabaseClient,userId:string,episodeAssemblyId:string){
 const{data,error}=await supabase.from("sound_design_plans").select(SELECT).eq("episode_assembly_id",episodeAssemblyId).eq("creator_id",userId).order("version",{ascending:false}).limit(1).maybeSingle();
 if(error)throw new SoundPersistenceError("SOUND_PERSISTENCE_FAILED","Unable to read latest SoundDesignPlan.",error);
 return data?{...(data as PlanRow),plan:parsePlan((data as PlanRow).plan)}:null;
}
export async function getSoundCueStates(supabase:SupabaseClient,userId:string,planId:string):Promise<SoundCueState[]>{
 const{data,error}=await supabase.from("sound_audio_generations").select("cue_id,status,asset_url,storage_path,mime_type,output_duration_seconds,duration_source,loopable,retry_count,sanitized_error_code").eq("sound_plan_id",planId).eq("creator_id",userId);
 if(error)throw new SoundPersistenceError("SOUND_PERSISTENCE_FAILED","Unable to read sound cue states.",error);
 return(data??[]).map(row=>({cueId:row.cue_id,status:row.status as SoundGenerationStatus,asset:row.asset_url&&row.storage_path&&row.mime_type&&row.output_duration_seconds?{url:row.asset_url,storagePath:row.storage_path,mimeType:row.mime_type,durationSeconds:Number(row.output_duration_seconds),durationSource:row.duration_source??"REQUESTED",loopable:!!row.loopable} as SoundAsset:null,errorCode:row.sanitized_error_code,retryCount:row.retry_count}));
}
export function materializeSoundDesignPlan(plan:SoundDesignPlan,states:SoundCueState[]):SoundDesignPlan{
 const byId=new Map(states.map(s=>[s.cueId,s]));
 return{...plan,cues:plan.cues.map(cue=>cue.type==="SILENCE"?cue:{...cue,generationStatus:byId.get(cue.id)?.status??cue.generationStatus})};
}
