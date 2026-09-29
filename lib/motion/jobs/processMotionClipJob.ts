import type {SupabaseClient} from "@supabase/supabase-js";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";
import {MotionPlanSchema} from "../schema";
import {buildMotionGenerationSpec} from "../buildMotionGenerationSpec";
import {buildMotionPrompt} from "../prompts/buildMotionPrompt";
import {mapTargetToRunwayDuration} from "../duration";
import {RunwayMotionVideoProvider} from "../providers/runway";
import type {MotionVideoProvider} from "../types";
import {createMotionQualityValidator} from "../quality";
import {removeMotionClip,uploadMotionClip} from "../storage";
import {VideoProviderMalformedResponseError,VideoProviderRefusalError,VideoProviderTimeoutError,VideoProviderTransientError} from "../providers/errors";

function mapError(error:unknown){
  if(error instanceof VideoProviderTimeoutError)return "VIDEO_PROVIDER_TIMEOUT";
  if(error instanceof VideoProviderRefusalError)return "VIDEO_GENERATION_DECLINED";
  if(error instanceof VideoProviderMalformedResponseError)return "INVALID_PROVIDER_RESPONSE";
  if(error instanceof VideoProviderTransientError)return "INTERNAL_TRANSIENT";
  const message=error instanceof Error?error.message:"";
  if(message.includes("MOTION_STORAGE_FAILED"))return "MOTION_STORAGE_FAILED";
  if(message.includes("MOTION_QUALITY_FAILED"))return "MOTION_QUALITY_FAILED";
  return "INTERNAL_TRANSIENT";
}

export async function processMotionClipJob(input:{
  supabase:SupabaseClient;jobId:string;claimToken:string;provider?:MotionVideoProvider;
}):Promise<"COMPLETED"|"FAILED"|"STALE"|"DEFERRED">{
  const {data:job,error:jobError}=await input.supabase.from("motion_clip_generations")
    .select("id,motion_plan_id,motion_clip_id,creator_id,status,prompt_checksum,prompt_version,provider,model,provider_duration_seconds,provider_task_id,attempt_id,claim_token,started_at")
    .eq("id",input.jobId).maybeSingle();
  if(jobError||!job||job.status!=="GENERATING"||job.claim_token!==input.claimToken)return "STALE";

  const {data:planRow}=await input.supabase.from("motion_plans")
    .select("id,series_id,scene_id,script_id,visual_plan_id,storyboard_id,animatic_id,creator_id,plan")
    .eq("id",job.motion_plan_id).maybeSingle();
  if(!planRow)return "STALE";
  const parsed=MotionPlanSchema.safeParse(planRow.plan);
  if(!parsed.success){
    await input.supabase.rpc("fail_motion_clip_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"CORRUPT_MOTION_PLAN"});
    return "FAILED";
  }
  const motionPlan=parsed.data;
  const motionClip=motionPlan.clips.find(c=>c.id===job.motion_clip_id);
  if(!motionClip||motionClip.generationStatus==="SKIPPED")return "STALE";

  const series=await getSeries(input.supabase,job.creator_id,planRow.series_id);
  const scene=await getScene(input.supabase,job.creator_id,planRow.series_id,planRow.scene_id,series.blueprint);
  const script=await getScript(input.supabase,job.creator_id,planRow.series_id,planRow.scene_id,planRow.script_id,series.blueprint,scene.blueprint);
  const visualPlan=await getVisualPlan(input.supabase,job.creator_id,planRow.series_id,planRow.scene_id,planRow.script_id,planRow.visual_plan_id,series.blueprint,scene.blueprint,script.script);
  const storyboardRow=await getStoryboard(input.supabase,job.creator_id,planRow.storyboard_id);
  const storyboard=materializeStoryboard(storyboardRow.blueprint,await getPanelStates(input.supabase,job.creator_id,planRow.storyboard_id));
  await getAnimatic(input.supabase,job.creator_id,planRow.animatic_id,script.script,visualPlan.plan,storyboard);

  const spec=buildMotionGenerationSpec({series:series.blueprint,scene:scene.blueprint,visualPlan:visualPlan.plan,storyboard,motionPlan,motionClipId:motionClip.id});
  const compiled=buildMotionPrompt(spec);
  if(compiled.promptChecksum!==job.prompt_checksum||job.provider_duration_seconds!==mapTargetToRunwayDuration(spec.durationSeconds)){
    await input.supabase.rpc("fail_motion_clip_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"PROMPT_CHECKSUM_MISMATCH"});
    return "FAILED";
  }

  let stale=false;
  let providerTaskId:string|null=job.provider_task_id??null;
  const heartbeat=setInterval(async()=>{
    const {data}=await input.supabase.rpc("renew_motion_clip_generation_lease",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_lease_seconds:900});
    if(data!==true)stale=true;
  },120000);

  let storagePath:string|null=null;
  try{
    const provider=input.provider??new RunwayMotionVideoProvider();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8*60*1000);
    let generated;
    try{
      generated=await provider.generate({
        sourceImageUrl:spec.inputImage.url,prompt:compiled.prompt,negativeConstraints:compiled.negativeConstraints,
        durationSeconds:spec.durationSeconds,aspectRatio:"16:9",signal:controller.signal,resumeTaskId:providerTaskId??undefined,
        onTaskCreated:async taskId=>{
          const {data}=await input.supabase.rpc("set_motion_provider_task",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_provider_task_id:taskId});
          if(data!==true){stale=true;throw new Error("STALE_CLAIM");}
          providerTaskId=taskId;
        }
      });
    }finally{clearTimeout(timeout);}
    if(stale)return "STALE";

    const quality=await createMotionQualityValidator().validate({video:generated,expectedDurationSeconds:spec.durationSeconds});
    if(!quality.ok)throw new Error("MOTION_QUALITY_FAILED");

    const uploaded=await uploadMotionClip(input.supabase,{
      creatorId:job.creator_id,motionPlanId:motionPlan.id,motionClipId:motionClip.id,attemptId:job.attempt_id,
      bytes:generated.bytes,mimeType:generated.mimeType
    });
    storagePath=uploaded.storagePath;
    if(stale){await removeMotionClip(input.supabase,uploaded.storagePath);return "STALE";}

    const {data:committed}=await input.supabase.rpc("complete_motion_clip_generation",{
      p_job_id:input.jobId,p_claim_token:input.claimToken,p_storage_path:uploaded.storagePath,p_asset_url:uploaded.url,
      p_output_duration_seconds:generated.durationSeconds,p_width:generated.width,p_height:generated.height,p_mime_type:generated.mimeType
    });
    if(committed!==true){await removeMotionClip(input.supabase,uploaded.storagePath);return "STALE";}
    return "COMPLETED";
  }catch(error){
    if(storagePath)await removeMotionClip(input.supabase,storagePath);
    if((error instanceof VideoProviderTimeoutError||error instanceof VideoProviderTransientError)&&providerTaskId){
      await input.supabase.rpc("renew_motion_clip_generation_lease",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_lease_seconds:60});
      return "DEFERRED";
    }
    if(error instanceof Error&&error.message==="STALE_CLAIM")return "STALE";
    await input.supabase.rpc("fail_motion_clip_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:mapError(error)});
    return "FAILED";
  }finally{clearInterval(heartbeat);}
}
