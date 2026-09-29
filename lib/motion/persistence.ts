import type {SupabaseClient} from "@supabase/supabase-js";
import {MotionPlanSchema} from "./schema";
import type {MotionClipState,MotionPlan,MotionPlanStatus} from "./types";

export class MotionPersistenceError extends Error{
  constructor(public readonly code:"MOTION_PLAN_NOT_FOUND"|"MOTION_PERSISTENCE_FAILED"|"CORRUPT_MOTION_PLAN",message:string,public readonly cause?:unknown){super(message);this.name="MotionPersistenceError";}
}

type Row={
  id:string;series_id:string;scene_id:string;script_id:string;visual_plan_id:string;storyboard_id:string;animatic_id:string;creator_id:string;
  version:number;status:MotionPlanStatus;plan:unknown;plan_schema_version:string;created_at:string;updated_at:string;archived_at:string|null;
};

function parsePlan(value:unknown):MotionPlan{
  const parsed=MotionPlanSchema.safeParse(value);
  if(!parsed.success)throw new MotionPersistenceError("CORRUPT_MOTION_PLAN","Stored MotionPlan failed validation.");
  return parsed.data as MotionPlan;
}

const SELECT="id,series_id,scene_id,script_id,visual_plan_id,storyboard_id,animatic_id,creator_id,version,status,plan,plan_schema_version,created_at,updated_at,archived_at";

export async function getMotionPlan(supabase:SupabaseClient,userId:string,motionPlanId:string){
  const {data,error}=await supabase.from("motion_plans").select(SELECT).eq("id",motionPlanId).eq("creator_id",userId).maybeSingle();
  if(error)throw new MotionPersistenceError("MOTION_PERSISTENCE_FAILED","Unable to read MotionPlan.",error);
  if(!data)throw new MotionPersistenceError("MOTION_PLAN_NOT_FOUND","MotionPlan not found.");
  const row=data as Row;
  return{...row,plan:parsePlan(row.plan)};
}

export async function getLatestMotionPlan(supabase:SupabaseClient,userId:string,animaticId:string){
  const {data,error}=await supabase.from("motion_plans").select(SELECT).eq("animatic_id",animaticId).eq("creator_id",userId).order("version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw new MotionPersistenceError("MOTION_PERSISTENCE_FAILED","Unable to read latest MotionPlan.",error);
  if(!data)return null;
  const row=data as Row;
  return{...row,plan:parsePlan(row.plan)};
}

export async function getMotionClipStates(supabase:SupabaseClient,userId:string,motionPlanId:string):Promise<MotionClipState[]>{
  const {data,error}=await supabase.from("motion_clip_generations")
    .select("motion_clip_id,status,asset_url,storage_path,output_duration_seconds,width,height,mime_type,retry_count,sanitized_error_code")
    .eq("motion_plan_id",motionPlanId).eq("creator_id",userId);
  if(error)throw new MotionPersistenceError("MOTION_PERSISTENCE_FAILED","Unable to read Motion clip states.",error);
  return(data??[]).map(row=>({
    motionClipId:row.motion_clip_id,
    status:row.status,
    outputAsset:row.asset_url&&row.storage_path&&row.output_duration_seconds&&row.width&&row.height&&row.mime_type
      ?{url:row.asset_url,storagePath:row.storage_path,durationSeconds:Number(row.output_duration_seconds),width:row.width,height:row.height,mimeType:row.mime_type}
      :null,
    errorCode:row.sanitized_error_code,
    retryCount:row.retry_count
  }));
}

export function materializeMotionPlan(plan:MotionPlan,states:MotionClipState[]):MotionPlan{
  const byId=new Map(states.map(s=>[s.motionClipId,s]));
  return{...plan,clips:plan.clips.map(clip=>{
    const state=byId.get(clip.id);
    return state?{...clip,generationStatus:state.status,outputAsset:state.outputAsset}:clip;
  })};
}
