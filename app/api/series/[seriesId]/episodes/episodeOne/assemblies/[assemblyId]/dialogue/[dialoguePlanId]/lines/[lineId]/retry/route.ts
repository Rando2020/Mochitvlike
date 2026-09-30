import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function POST(_request:NextRequest,{params}:{params:Promise<{seriesId:string;assemblyId:string;dialoguePlanId:string;lineId:string}>}){
  const {seriesId,assemblyId,dialoguePlanId,lineId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
  const {data:row,error:lookupError}=await supabase.from("dialogue_audio_generations")
    .select("id,status,retry_count,dialogue_audio_plans!inner(series_id,episode_assembly_id,creator_id)")
    .eq("line_id",lineId).eq("dialogue_plan_id",dialoguePlanId).eq("creator_id",user.id).maybeSingle();
  if(lookupError||!row)return NextResponse.json({error:{code:"DIALOGUE_LINE_NOT_FOUND"}},{status:404});
  const parent=(row as any).dialogue_audio_plans;
  if(parent.series_id!==seriesId||parent.episode_assembly_id!==assemblyId||parent.creator_id!==user.id)return NextResponse.json({error:{code:"DIALOGUE_LINE_NOT_FOUND"}},{status:404});
  if(row.status!=="FAILED")return NextResponse.json({error:{code:"DIALOGUE_LINE_NOT_RETRYABLE"}},{status:409});
  const {data,error:retryError}=await supabase.rpc("retry_dialogue_audio_generation",{p_job_id:row.id});
  if(retryError||data!==true)return NextResponse.json({error:{code:"DIALOGUE_RETRY_REJECTED"}},{status:409});
  return NextResponse.json({line:{id:lineId,status:"PENDING",retryCount:row.retry_count+1}},{status:202});
}
