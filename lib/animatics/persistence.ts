import type {SupabaseClient} from "@supabase/supabase-js";
import type {SceneScript} from "@/lib/scripts/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {StoryboardBlueprint} from "@/lib/storyboards/types";
import {AnimaticTimelineSchema} from "./schema";
import {validateAnimaticTimeline} from "./validateAnimaticTimeline";
import type {AnimaticStatus,AnimaticSummary,AnimaticTimeline} from "./types";

export class AnimaticPersistenceError extends Error{
  constructor(public readonly code:"ANIMATIC_NOT_FOUND"|"ANIMATIC_PERSISTENCE_FAILED"|"CORRUPT_ANIMATIC",message:string,public readonly cause?:unknown){super(message);this.name="AnimaticPersistenceError";}
}

type Row={id:string;series_id:string;scene_id:string;script_id:string;visual_plan_id:string;storyboard_id:string;creator_id:string;version:number;status:AnimaticStatus;timeline:unknown;timeline_schema_version:string;preview_storage_path:string|null;preview_url:string|null;preview_mime_type:string|null;created_at:string;updated_at:string;archived_at:string|null};

function map(row:Row,script?:SceneScript,visualPlan?:VisualPlan,storyboard?:StoryboardBlueprint){
  const parsed=AnimaticTimelineSchema.safeParse(row.timeline);
  if(!parsed.success)throw new AnimaticPersistenceError("CORRUPT_ANIMATIC","Stored Animatic failed schema validation.");
  if(script&&visualPlan&&storyboard){
    const result=validateAnimaticTimeline(parsed.data,script,visualPlan,storyboard,{
      animaticId:row.id,seriesId:row.series_id,sceneId:row.scene_id,scriptId:row.script_id,visualPlanId:row.visual_plan_id,storyboardId:row.storyboard_id,version:row.version
    });
    if(!result.success)throw new AnimaticPersistenceError("CORRUPT_ANIMATIC","Stored Animatic failed continuity validation.");
  }
  return{id:row.id,seriesId:row.series_id,sceneId:row.scene_id,scriptId:row.script_id,visualPlanId:row.visual_plan_id,storyboardId:row.storyboard_id,creatorId:row.creator_id,version:row.version,status:row.status,timeline:parsed.data as AnimaticTimeline,schemaVersion:row.timeline_schema_version,preview:row.preview_url&&row.preview_storage_path&&row.preview_mime_type?{url:row.preview_url,storagePath:row.preview_storage_path,mimeType:row.preview_mime_type}:null,createdAt:row.created_at,updatedAt:row.updated_at,archivedAt:row.archived_at};
}

const SELECT="id,series_id,scene_id,script_id,visual_plan_id,storyboard_id,creator_id,version,status,timeline,timeline_schema_version,preview_storage_path,preview_url,preview_mime_type,created_at,updated_at,archived_at";

export async function getAnimatic(supabase:SupabaseClient,userId:string,animaticId:string,script?:SceneScript,visualPlan?:VisualPlan,storyboard?:StoryboardBlueprint){
  const {data,error}=await supabase.from("scene_animatics").select(SELECT).eq("id",animaticId).eq("creator_id",userId).maybeSingle();
  if(error)throw new AnimaticPersistenceError("ANIMATIC_PERSISTENCE_FAILED","Unable to read Animatic.",error);
  if(!data)throw new AnimaticPersistenceError("ANIMATIC_NOT_FOUND","Animatic was not found.");
  return map(data as Row,script,visualPlan,storyboard);
}

export async function getLatestAnimatic(supabase:SupabaseClient,userId:string,storyboardId:string){
  const {data,error}=await supabase.from("scene_animatics").select(SELECT).eq("storyboard_id",storyboardId).eq("creator_id",userId).order("version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw new AnimaticPersistenceError("ANIMATIC_PERSISTENCE_FAILED","Unable to read latest Animatic.",error);
  return data?map(data as Row):null;
}

export async function listAnimatics(supabase:SupabaseClient,userId:string,storyboardId:string):Promise<AnimaticSummary[]>{
  const {data,error}=await supabase.from("scene_animatics").select("id,version,status,timeline,updated_at").eq("storyboard_id",storyboardId).eq("creator_id",userId).order("version",{ascending:false});
  if(error)throw new AnimaticPersistenceError("ANIMATIC_PERSISTENCE_FAILED","Unable to list Animatics.",error);
  return(data??[]).map(row=>{
    const parsed=AnimaticTimelineSchema.safeParse(row.timeline);
    if(!parsed.success)throw new AnimaticPersistenceError("CORRUPT_ANIMATIC","Stored Animatic failed schema validation.");
    return{id:row.id,version:row.version,status:row.status,timelineDurationSeconds:parsed.data.pacingChecks.timelineDurationSeconds,updatedAt:row.updated_at};
  });
}
