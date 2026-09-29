import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getMotionPlan,getMotionClipStates,materializeMotionPlan} from "@/lib/motion/persistence";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string;animaticId:string;motionPlanId:string}>}){
  const {seriesId,sceneId,scriptId,planId,storyboardId,animaticId,motionPlanId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
  try{
    const row=await getMotionPlan(supabase,user.id,motionPlanId);
    if(row.series_id!==seriesId||row.scene_id!==sceneId||row.script_id!==scriptId||row.visual_plan_id!==planId||row.storyboard_id!==storyboardId||row.animatic_id!==animaticId)
      return NextResponse.json({error:{code:"MOTION_PLAN_NOT_FOUND"}},{status:404});
    const states=await getMotionClipStates(supabase,user.id,motionPlanId);
    const plan=materializeMotionPlan(row.plan,states);
    return NextResponse.json({
      motionPlan:{
        id:row.id,status:row.status,version:row.version,
        clips:plan.clips.map(clip=>({
          id:clip.id,sequenceIndex:clip.sequenceIndex,targetDurationSeconds:clip.targetDurationSeconds,generationStatus:clip.generationStatus,
          inputAsset:clip.inputAsset,outputAsset:clip.outputAsset,
          error:states.find(s=>s.motionClipId===clip.id)?.errorCode?{code:states.find(s=>s.motionClipId===clip.id)!.errorCode}:null,
          retryCount:states.find(s=>s.motionClipId===clip.id)?.retryCount??0
        })),
        pollAfterMs:3000
      }
    },{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:{code:"MOTION_PLAN_NOT_FOUND"}},{status:404});}
}
