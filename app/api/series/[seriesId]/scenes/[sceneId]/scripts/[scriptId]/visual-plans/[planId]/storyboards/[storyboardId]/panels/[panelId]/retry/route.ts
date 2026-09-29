import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
export async function POST(_request:NextRequest,{params}:{params:Promise<{storyboardId:string;panelId:string}>}){
 const {storyboardId,panelId}=await params;
 const supabase=await createServerSupabaseClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 const {data:job}=await supabase.from("storyboard_panel_generations").select("id,status,retry_count")
  .eq("storyboard_id",storyboardId).eq("panel_id",panelId).eq("creator_id",user.id).maybeSingle();
 if(!job)return NextResponse.json({error:{code:"PANEL_NOT_FOUND"}},{status:404});
 if(job.status!=="FAILED")return NextResponse.json({error:{code:"PANEL_NOT_RETRYABLE"}},{status:409});
 const {data:retried,error:retryError}=await supabase.rpc("retry_storyboard_panel_generation",{p_job_id:job.id});
 if(retryError||retried!==true)return NextResponse.json({error:{code:"PANEL_RETRY_LIMIT"}},{status:409});
 return NextResponse.json({panel:{id:panelId,status:"PENDING",retryCount:job.retry_count+1}},{status:202});
}
