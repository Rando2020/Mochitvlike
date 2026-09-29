import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";
import {compileMotionPlan} from "@/lib/motion/compileMotionPlan";
import {validateMotionPlan} from "@/lib/motion/validateMotionPlan";
import {buildMotionGenerationSpec} from "@/lib/motion/buildMotionGenerationSpec";
import {buildMotionPrompt} from "@/lib/motion/prompts/buildMotionPrompt";
import {mapTargetToRunwayDuration} from "@/lib/motion/duration";
import {getLatestMotionPlan,getMotionClipStates} from "@/lib/motion/persistence";

const Body=z.object({mode:z.literal("INITIAL")}).strict(),Uuid=z.string().uuid();
const fail=(status:number,code:string)=>NextResponse.json({error:{code}},{status});

function summary(row:{id:string;status:string;plan:{clips:unknown[]}},states:Array<{status:string}>){
  const resolved=states.filter(s=>s.status==="COMPLETED"||s.status==="SKIPPED").length;
  return{id:row.id,status:row.status,clipCount:row.plan.clips.length,resolvedClips:resolved,pollAfterMs:3000};
}

export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string;animaticId:string}>}){
  const {seriesId,sceneId,scriptId,planId,storyboardId,animaticId}=await params;
  if([seriesId,sceneId,scriptId,planId,storyboardId,animaticId].some(id=>!Uuid.safeParse(id).success))return fail(404,"MOTION_PARENT_NOT_FOUND");
  let json:unknown;try{json=await request.json();}catch{return fail(400,"INVALID_MOTION_REQUEST");}
  if(!Body.safeParse(json).success)return fail(400,"INVALID_MOTION_REQUEST");

  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return fail(401,"UNAUTHENTICATED");

  try{
    const series=await getSeries(supabase,user.id,seriesId);
    const scene=await getScene(supabase,user.id,seriesId,sceneId,series.blueprint);
    const script=await getScript(supabase,user.id,seriesId,sceneId,scriptId,series.blueprint,scene.blueprint);
    const visualPlan=await getVisualPlan(supabase,user.id,seriesId,sceneId,scriptId,planId,series.blueprint,scene.blueprint,script.script);
    const storyboardRow=await getStoryboard(supabase,user.id,storyboardId);
    if(storyboardRow.series_id!==seriesId||storyboardRow.scene_id!==sceneId||storyboardRow.script_id!==scriptId||storyboardRow.visual_plan_id!==planId)return fail(404,"MOTION_PARENT_NOT_FOUND");
    const storyboard=materializeStoryboard(storyboardRow.blueprint,await getPanelStates(supabase,user.id,storyboardId));
    const animatic=await getAnimatic(supabase,user.id,animaticId,script.script,visualPlan.plan,storyboard);
    if(animatic.storyboardId!==storyboardId)return fail(404,"MOTION_PARENT_NOT_FOUND");

    const existing=await getLatestMotionPlan(supabase,user.id,animaticId);
    if(existing){
      const states=await getMotionClipStates(supabase,user.id,existing.id);
      return NextResponse.json({motionPlan:summary(existing,states)},{status:existing.status==="READY"?200:202});
    }

    const motionPlanId=randomUUID();
    const plan=compileMotionPlan({
      motionPlanId,version:1,series:series.blueprint,scene:scene.blueprint,script:script.script,
      visualPlan:visualPlan.plan,storyboard,animatic:animatic.timeline
    });
    const valid=validateMotionPlan(plan,animatic.timeline,storyboard,visualPlan.plan,{
      motionPlanId,seriesId,sceneId,scriptId,visualPlanId:planId,storyboardId,animaticId,version:1
    });
    if(!valid.success)return fail(422,"MOTION_PLAN_VALIDATION_FAILED");

    const provider="runway",model=process.env.RUNWAY_MOTION_MODEL??"gen4.5";
    const jobs=plan.clips.map(clip=>{
      if(clip.generationStatus==="SKIPPED")return{
        id:randomUUID(),motion_clip_id:clip.id,status:"SKIPPED",prompt_checksum:null,prompt_version:null,provider:null,model:null,provider_duration_seconds:null
      };
      const spec=buildMotionGenerationSpec({series:series.blueprint,scene:scene.blueprint,visualPlan:visualPlan.plan,storyboard,motionPlan:plan,motionClipId:clip.id});
      const compiled=buildMotionPrompt(spec);
      return{
        id:randomUUID(),motion_clip_id:clip.id,status:"PENDING",prompt_checksum:compiled.promptChecksum,prompt_version:compiled.promptVersion,
        provider,model,provider_duration_seconds:mapTargetToRunwayDuration(spec.durationSeconds)
      };
    });

    const admin=createAdminSupabaseClient();
    const {data:created,error:createError}=await admin.rpc("create_motion_plan_with_jobs",{
      p_motion_plan_id:motionPlanId,p_creator_id:user.id,p_series_id:seriesId,p_scene_id:sceneId,p_script_id:scriptId,
      p_visual_plan_id:planId,p_storyboard_id:storyboardId,p_animatic_id:animaticId,p_version:1,p_plan:plan,p_jobs:jobs
    });
    if(createError)return fail(503,"MOTION_QUEUE_FAILED");

    if(created!==true){
      const raced=await getLatestMotionPlan(supabase,user.id,animaticId);
      if(!raced)return fail(409,"MOTION_PERSISTENCE_RACE");
      const states=await getMotionClipStates(supabase,user.id,raced.id);
      return NextResponse.json({motionPlan:summary(raced,states)},{status:raced.status==="READY"?200:202});
    }

    const skipped=jobs.filter(j=>j.status==="SKIPPED").length;
    return NextResponse.json({motionPlan:{id:motionPlanId,status:skipped===jobs.length?"READY":"GENERATING",clipCount:jobs.length,resolvedClips:skipped,pollAfterMs:3000}},{status:202});
  }catch{
    return fail(404,"MOTION_PARENT_NOT_FOUND");
  }
}
