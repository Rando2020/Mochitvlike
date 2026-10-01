import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getProductionFrame} from "@/lib/production-frames/persistence";
export async function POST(_request:NextRequest,{params}:{params:Promise<{storyboardId:string;panelId:string;frameId:string}>}){
 const ids=await params;const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{
  const frame=await getProductionFrame(supabase,user.id,ids.frameId);
  if(frame.storyboardId!==ids.storyboardId||frame.storyboardPanelId!==ids.panelId||!frame.generation)throw new Error("NOT_FOUND");
  if(frame.generation.status!=="FAILED")return NextResponse.json({error:{code:"PRODUCTION_FRAME_NOT_RETRYABLE"}},{status:409});
  const {data,error:retryError}=await supabase.rpc("retry_production_frame_generation",{p_job_id:frame.generation.id});
  if(retryError||data!==true)return NextResponse.json({error:{code:"PRODUCTION_FRAME_RETRY_LIMIT"}},{status:409});
  return NextResponse.json({productionFrame:{id:frame.id,status:"GENERATING",generation:{id:frame.generation.id,status:"PENDING",retryCount:frame.generation.retryCount+1}}},{status:202});
 }catch{return NextResponse.json({error:{code:"PRODUCTION_FRAME_NOT_FOUND"}},{status:404});}
}
