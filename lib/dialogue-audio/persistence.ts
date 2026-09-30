import type {SupabaseClient} from "@supabase/supabase-js";
import {VoiceCastSchema,DialogueAudioPlanSchema} from "./schema";
import type {VoiceCast,DialogueAudioPlan,DialoguePlanStatus,DialogueLineStatus,DialogueAudioAsset,DialogueTimingFit} from "./types";

export class DialogueAudioPersistenceError extends Error{
  constructor(public readonly code:"VOICE_CAST_NOT_FOUND"|"DIALOGUE_PLAN_NOT_FOUND"|"DIALOGUE_PERSISTENCE_FAILED"|"CORRUPT_DIALOGUE_DATA",message:string,public readonly cause?:unknown){super(message);this.name="DialogueAudioPersistenceError";}
}
type VoiceRow={id:string;series_id:string;episode_assembly_id:string;creator_id:string;version:number;cast:unknown;cast_schema_version:string;created_at:string;updated_at:string;archived_at:string|null};
type PlanRow={id:string;series_id:string;episode_assembly_id:string;voice_cast_id:string;creator_id:string;version:number;status:DialoguePlanStatus;plan:unknown;plan_schema_version:string;created_at:string;updated_at:string;archived_at:string|null};
export type DialogueLineState={lineId:string;status:DialogueLineStatus;audioAsset:DialogueAudioAsset|null;naturalDurationSeconds:number|null;differenceSeconds:number|null;fit:DialogueTimingFit;errorCode:string|null;retryCount:number};

function parseCast(value:unknown):VoiceCast{const p=VoiceCastSchema.safeParse(value);if(!p.success)throw new DialogueAudioPersistenceError("CORRUPT_DIALOGUE_DATA","Stored VoiceCast failed validation.");return p.data as VoiceCast;}
function parsePlan(value:unknown):DialogueAudioPlan{const p=DialogueAudioPlanSchema.safeParse(value);if(!p.success)throw new DialogueAudioPersistenceError("CORRUPT_DIALOGUE_DATA","Stored DialogueAudioPlan failed validation.");return p.data as DialogueAudioPlan;}

export async function getVoiceCast(supabase:SupabaseClient,userId:string,id:string){
  const {data,error}=await supabase.from("voice_casts").select("id,series_id,episode_assembly_id,creator_id,version,cast,cast_schema_version,created_at,updated_at,archived_at").eq("id",id).eq("creator_id",userId).maybeSingle();
  if(error)throw new DialogueAudioPersistenceError("DIALOGUE_PERSISTENCE_FAILED","Unable to read VoiceCast.",error);
  if(!data)throw new DialogueAudioPersistenceError("VOICE_CAST_NOT_FOUND","VoiceCast not found.");
  return{...(data as VoiceRow),cast:parseCast((data as VoiceRow).cast)};
}
export async function getDialogueAudioPlan(supabase:SupabaseClient,userId:string,id:string){
  const {data,error}=await supabase.from("dialogue_audio_plans").select("id,series_id,episode_assembly_id,voice_cast_id,creator_id,version,status,plan,plan_schema_version,created_at,updated_at,archived_at").eq("id",id).eq("creator_id",userId).maybeSingle();
  if(error)throw new DialogueAudioPersistenceError("DIALOGUE_PERSISTENCE_FAILED","Unable to read DialogueAudioPlan.",error);
  if(!data)throw new DialogueAudioPersistenceError("DIALOGUE_PLAN_NOT_FOUND","DialogueAudioPlan not found.");
  return{...(data as PlanRow),plan:parsePlan((data as PlanRow).plan)};
}
export async function getLatestDialogueAudioPlan(supabase:SupabaseClient,userId:string,episodeAssemblyId:string){
  const {data,error}=await supabase.from("dialogue_audio_plans").select("id,series_id,episode_assembly_id,voice_cast_id,creator_id,version,status,plan,plan_schema_version,created_at,updated_at,archived_at").eq("episode_assembly_id",episodeAssemblyId).eq("creator_id",userId).order("version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw new DialogueAudioPersistenceError("DIALOGUE_PERSISTENCE_FAILED","Unable to read latest DialogueAudioPlan.",error);
  return data?{...(data as PlanRow),plan:parsePlan((data as PlanRow).plan)}:null;
}
export async function getDialogueLineStates(supabase:SupabaseClient,userId:string,planId:string):Promise<DialogueLineState[]>{
  const {data,error}=await supabase.from("dialogue_audio_generations").select("line_id,status,asset_url,storage_path,mime_type,output_duration_seconds,sample_rate,channels,timing_difference_seconds,timing_fit,sanitized_error_code,retry_count").eq("dialogue_plan_id",planId).eq("creator_id",userId);
  if(error)throw new DialogueAudioPersistenceError("DIALOGUE_PERSISTENCE_FAILED","Unable to read dialogue line states.",error);
  return(data??[]).map(row=>({
    lineId:row.line_id,status:row.status,
    audioAsset:row.asset_url&&row.storage_path&&row.mime_type&&row.output_duration_seconds&&row.sample_rate&&row.channels?{
      url:row.asset_url,storagePath:row.storage_path,mimeType:row.mime_type,durationSeconds:Number(row.output_duration_seconds),sampleRate:row.sample_rate,channels:row.channels
    }:null,
    naturalDurationSeconds:row.output_duration_seconds?Number(row.output_duration_seconds):null,
    differenceSeconds:row.timing_difference_seconds===null?null:Number(row.timing_difference_seconds),
    fit:row.timing_fit??"UNKNOWN",errorCode:row.sanitized_error_code,retryCount:row.retry_count
  }));
}
export function materializeDialogueAudioPlan(plan:DialogueAudioPlan,states:DialogueLineState[]):DialogueAudioPlan{
  const byId=new Map(states.map(s=>[s.lineId,s]));
  return{...plan,lines:plan.lines.map(line=>{
    const state=byId.get(line.id);if(!state)return line;
    return{...line,generationStatus:state.status,audioAsset:state.audioAsset,timing:{naturalDurationSeconds:state.naturalDurationSeconds,differenceSeconds:state.differenceSeconds,fit:state.fit}};
  })};
}
