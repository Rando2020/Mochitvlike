import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function POST(_request:NextRequest,{params}:{params:Promise<{motionPlanId:string;motionClipId:string}>}){
  const {motionPlanId,motionClipId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
  const {data:job,error:readError}=await supabase.from("motion_clip_generations")
    .select("id,status,retry_count").eq("motion_plan_id",motionPlanId).eq("motion_clip_id",motionClipId).eq("creator_id",user.id).maybeSingle();
  if(readError||!job)return NextResponse.json({error:{code:"MOTION_CLIP_NOT_FOUND"}},{status:404});
  if(job.status!=="FAILED")return NextResponse.json({error:{code:"MOTION_CLIP_NOT_RETRYABLE"}},{status:409});
  const {data,error:retryError}=await supabase.rpc("retry_motion_clip_generation",{p_job_id:job.id});
  if(retryError||data!==true)return NextResponse.json({error:{code:"MOTION_RETRY_LIMIT"}},{status:409});
  return NextResponse.json({motionClip:{id:motionClipId,status:"PENDING",retryCount:job.retry_count+1}},{status:202});
}
