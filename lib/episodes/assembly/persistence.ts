import type {SupabaseClient} from "@supabase/supabase-js";
import {EpisodeTimelineSchema} from "./schema";
import type {EpisodeAssemblyStatus,EpisodeTimeline} from "./types";

export class EpisodeAssemblyPersistenceError extends Error{
  constructor(public readonly code:"EPISODE_ASSEMBLY_NOT_FOUND"|"EPISODE_ASSEMBLY_PERSISTENCE_FAILED"|"CORRUPT_EPISODE_TIMELINE",message:string,public readonly cause?:unknown){super(message);this.name="EpisodeAssemblyPersistenceError";}
}
type Row={
  id:string;series_id:string;episode_key:"episodeOne";creator_id:string;version:number;status:EpisodeAssemblyStatus;timeline:unknown;timeline_schema_version:string;
  preview_storage_path:string|null;preview_url:string|null;preview_mime_type:string|null;created_at:string;updated_at:string;archived_at:string|null;
};
const SELECT="id,series_id,episode_key,creator_id,version,status,timeline,timeline_schema_version,preview_storage_path,preview_url,preview_mime_type,created_at,updated_at,archived_at";

function parseTimeline(value:unknown):EpisodeTimeline{
  const parsed=EpisodeTimelineSchema.safeParse(value);
  if(!parsed.success)throw new EpisodeAssemblyPersistenceError("CORRUPT_EPISODE_TIMELINE","Stored EpisodeTimeline failed validation.");
  return parsed.data as EpisodeTimeline;
}
function shape(row:Row){return{...row,timeline:parseTimeline(row.timeline),preview:row.preview_url&&row.preview_storage_path&&row.preview_mime_type?{url:row.preview_url,storagePath:row.preview_storage_path,mimeType:row.preview_mime_type}:null};}

export async function getEpisodeAssembly(supabase:SupabaseClient,userId:string,assemblyId:string){
  const {data,error}=await supabase.from("episode_assemblies").select(SELECT).eq("id",assemblyId).eq("creator_id",userId).maybeSingle();
  if(error)throw new EpisodeAssemblyPersistenceError("EPISODE_ASSEMBLY_PERSISTENCE_FAILED","Unable to read Episode Assembly.",error);
  if(!data)throw new EpisodeAssemblyPersistenceError("EPISODE_ASSEMBLY_NOT_FOUND","Episode Assembly not found.");
  return shape(data as Row);
}
export async function getLatestEpisodeAssembly(supabase:SupabaseClient,userId:string,seriesId:string,episodeKey:"episodeOne"){
  const {data,error}=await supabase.from("episode_assemblies").select(SELECT).eq("series_id",seriesId).eq("episode_key",episodeKey).eq("creator_id",userId).order("version",{ascending:false}).limit(1).maybeSingle();
  if(error)throw new EpisodeAssemblyPersistenceError("EPISODE_ASSEMBLY_PERSISTENCE_FAILED","Unable to read latest Episode Assembly.",error);
  return data?shape(data as Row):null;
}
