import { randomUUID } from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {buildPanelGenerationSpec} from "../buildPanelGenerationSpec";
import {buildStoryboardPanelPrompt} from "../images/buildStoryboardPanelPrompt";
import {OpenAIStoryboardImageProvider,type StoryboardImageProvider} from "../images/provider";
import {StoryboardBlueprintSchema} from "../schema";
import {removeStoryboardPanel,uploadStoryboardPanel} from "../storage";

function mapError(error:unknown){
 const message=error instanceof Error?error.message:"",name=error instanceof Error?error.name:"";
 if(name==="AbortError"||message.toLowerCase().includes("timeout")||message.toLowerCase().includes("aborted"))return "IMAGE_PROVIDER_TIMEOUT";
 if(message.toLowerCase().includes("refus"))return "IMAGE_GENERATION_DECLINED";
 if(message.includes("MALFORMED"))return "INVALID_PROVIDER_RESPONSE";
 if(message.includes("STORAGE"))return "STORYBOARD_STORAGE_FAILED";
 return "INTERNAL_TRANSIENT";
}

export async function processStoryboardPanelJob(input:{supabase:SupabaseClient;jobId:string;claimToken:string;provider?:StoryboardImageProvider;}):Promise<"COMPLETED"|"STALE"|"FAILED">{
 const {data:job,error:jobError}=await input.supabase.from("storyboard_panel_generations")
  .select("id,storyboard_id,panel_id,creator_id,status,prompt_checksum,attempt_id,claim_token").eq("id",input.jobId).maybeSingle();
 if(jobError||!job||job.status!=="GENERATING"||job.claim_token!==input.claimToken)return "STALE";

 const {data:storyboard}=await input.supabase.from("storyboards")
  .select("id,series_id,scene_id,script_id,visual_plan_id,creator_id,blueprint").eq("id",job.storyboard_id).maybeSingle();
 if(!storyboard)return "STALE";
 const parsedBlueprint=StoryboardBlueprintSchema.safeParse(storyboard.blueprint);
 if(!parsedBlueprint.success){
  await input.supabase.rpc("fail_storyboard_panel_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"CORRUPT_STORYBOARD"});
  return "FAILED";
 }
 const panel=parsedBlueprint.data.panels.find(p=>p.id===job.panel_id);
 if(!panel)return "STALE";

 const series=await getSeries(input.supabase,job.creator_id,storyboard.series_id);
 const scene=await getScene(input.supabase,job.creator_id,storyboard.series_id,storyboard.scene_id,series.blueprint);
 const script=await getScript(input.supabase,job.creator_id,storyboard.series_id,storyboard.scene_id,storyboard.script_id,series.blueprint,scene.blueprint);
 const visualPlan=await getVisualPlan(input.supabase,job.creator_id,storyboard.series_id,storyboard.scene_id,storyboard.script_id,storyboard.visual_plan_id,series.blueprint,scene.blueprint,script.script);

 const spec=buildPanelGenerationSpec({storyboardId:storyboard.id,seriesId:storyboard.series_id,sceneId:storyboard.scene_id,series:series.blueprint,scene:scene.blueprint,visualPlan:visualPlan.plan,panel});
 const compiled=buildStoryboardPanelPrompt(spec);
 if(compiled.promptChecksum!==job.prompt_checksum){
  await input.supabase.rpc("fail_storyboard_panel_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"PROMPT_CHECKSUM_MISMATCH"});
  return "FAILED";
 }

 let stale=false;
 const heartbeat=setInterval(async()=>{
  const {data}=await input.supabase.rpc("renew_storyboard_panel_generation_lease",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_lease_seconds:180});
  if(data!==true)stale=true;
 },60000);

 let storagePath:string|null=null;
 try{
  const provider=input.provider??new OpenAIStoryboardImageProvider();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),150000);
  let generated;
  try{generated=await provider.generate({prompt:compiled.prompt,negativeConstraints:compiled.negativeConstraints,width:1536,height:1024,signal:controller.signal});}
  finally{clearTimeout(timeout);}
  if(stale)return "STALE";

  const uploaded=await uploadStoryboardPanel(input.supabase,{creatorId:job.creator_id,storyboardId:storyboard.id,panelId:panel.id,attemptId:job.attempt_id??randomUUID(),bytes:generated.bytes,mimeType:generated.mimeType});
  storagePath=uploaded.storagePath;
  if(stale){await removeStoryboardPanel(input.supabase,uploaded.storagePath);return "STALE";}

  const {data:committed}=await input.supabase.rpc("complete_storyboard_panel_generation",{
   p_job_id:input.jobId,p_claim_token:input.claimToken,p_storage_path:uploaded.storagePath,p_asset_url:uploaded.url,p_width:generated.width,p_height:generated.height,p_mime_type:generated.mimeType
  });
  if(committed!==true){await removeStoryboardPanel(input.supabase,uploaded.storagePath);return "STALE";}
  return "COMPLETED";
 }catch(error){
  if(storagePath)await removeStoryboardPanel(input.supabase,storagePath);
  await input.supabase.rpc("fail_storyboard_panel_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:mapError(error)});
  return "FAILED";
 }finally{clearInterval(heartbeat);}
}
