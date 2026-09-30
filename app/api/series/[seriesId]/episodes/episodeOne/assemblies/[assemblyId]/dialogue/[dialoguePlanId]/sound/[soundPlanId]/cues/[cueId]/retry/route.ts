import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
export async function POST(_request:NextRequest,{params}:{params:Promise<{seriesId:string;assemblyId:string;dialoguePlanId:string;soundPlanId:string;cueId:string}>}){
 const ids=await params,supabase=await createServerSupabaseClient();const{data:{user},error}=await supabase.auth.getUser();if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 const{data:row,error:lookup}=await supabase.from("sound_audio_generations").select("id,status,retry_count,sound_design_plans!inner(series_id,episode_assembly_id,dialogue_plan_id,creator_id)").eq("sound_plan_id",ids.soundPlanId).eq("cue_id",ids.cueId).eq("creator_id",user.id).maybeSingle();
 if(lookup||!row)return NextResponse.json({error:{code:"SOUND_CUE_NOT_FOUND"}},{status:404});const p=(row as any).sound_design_plans;
 if(p.series_id!==ids.seriesId||p.episode_assembly_id!==ids.assemblyId||p.dialogue_plan_id!==ids.dialoguePlanId||p.creator_id!==user.id)return NextResponse.json({error:{code:"SOUND_CUE_NOT_FOUND"}},{status:404});
 if(row.status!=="FAILED")return NextResponse.json({error:{code:"SOUND_CUE_NOT_RETRYABLE"}},{status:409});
 const{data,error:retry}=await supabase.rpc("retry_sound_generation",{p_job_id:row.id});if(retry||data!==true)return NextResponse.json({error:{code:"SOUND_RETRY_REJECTED"}},{status:409});
 return NextResponse.json({cue:{id:ids.cueId,status:"PENDING",retryCount:row.retry_count+1}},{status:202});
}
