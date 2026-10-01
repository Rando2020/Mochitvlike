import type {SupabaseClient} from "@supabase/supabase-js";
import {ProductionFrameGenerationSpecSchema} from "../schema";
import {compileProductionFramePrompt,productionFrameSpecChecksum} from "../prompt";
import {HttpProductionFrameProvider,type ProductionFrameProvider} from "../provider";
import {validateProductionFrameOutput} from "../quality";
import {removeProductionFrame,uploadProductionFrame} from "../storage";
import {VisualModelRegistry} from "@/lib/visual-models/registry";
import {assertProductionReference} from "../references";

function errorCode(error:unknown){
 const message=error instanceof Error?error.message:"";
 if(message.includes("TIMEOUT")||message.toLowerCase().includes("aborted"))return "PRODUCTION_FRAME_PROVIDER_TIMEOUT";
 if(message.includes("MALFORMED"))return "INVALID_PROVIDER_RESPONSE";
 if(message.includes("STORAGE"))return "PRODUCTION_FRAME_STORAGE_FAILED";
 if(message.includes("NOT_CONFIGURED"))return "PRODUCTION_FRAME_PROVIDER_NOT_CONFIGURED";
 return "INTERNAL_TRANSIENT";
}
export async function processProductionFrameJob(input:{supabase:SupabaseClient;jobId:string;claimToken:string;provider?:ProductionFrameProvider}):Promise<"COMPLETED"|"STALE"|"FAILED">{
 const {data:job}=await input.supabase.from("production_frame_generations").select("id,production_frame_id,creator_id,status,claim_token,attempt_id,spec,spec_checksum,prompt_checksum,model_id,model_revision").eq("id",input.jobId).maybeSingle();
 if(!job||job.status!=="GENERATING"||job.claim_token!==input.claimToken)return "STALE";
 const {data:frame}=await input.supabase.from("production_frames").select("id,creator_id,series_id,storyboard_id,storyboard_panel_id,development_visual").eq("id",job.production_frame_id).maybeSingle();
 if(!frame||frame.creator_id!==job.creator_id)return "STALE";
 const parsed=ProductionFrameGenerationSpecSchema.safeParse(job.spec);
 if(!parsed.success){await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"CORRUPT_PRODUCTION_FRAME_SPEC"});return "FAILED";}
 const spec=parsed.data;
 if(spec.id!==frame.id||spec.seriesId!==frame.series_id||spec.storyboardId!==frame.storyboard_id||spec.storyboardPanelId!==frame.storyboard_panel_id){await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"PRODUCTION_FRAME_PARENT_MISMATCH"});return "FAILED";}
 if(productionFrameSpecChecksum(spec)!==job.spec_checksum){await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"SPEC_CHECKSUM_MISMATCH"});return "FAILED";}
 const prompt=compileProductionFramePrompt(spec);if(prompt.promptChecksum!==job.prompt_checksum||prompt.promptChecksum!==spec.promptChecksum){await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"PROMPT_CHECKSUM_MISMATCH"});return "FAILED";}
 const model=new VisualModelRegistry().get(spec.model.modelId);
 if(!model||model.source.revision!==spec.model.revision||model.source.revision!==job.model_revision){await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"MODEL_REVISION_MISMATCH"});return "FAILED";}
 if(!spec.model.developmentOverride&&model.productionStatus!=="APPROVED"){await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"MODEL_NOT_APPROVED"});return "FAILED";}
 try{for(const reference of spec.references)assertProductionReference(reference,model.id);}catch{await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"REFERENCE_PROVENANCE_INVALID"});return "FAILED";}

 let stale=false;let storagePath:string|null=null;
 const heartbeat=setInterval(async()=>{const {data}=await input.supabase.rpc("renew_production_frame_generation_lease",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_lease_seconds:180});if(data!==true)stale=true;},60000);
 try{
  const provider=input.provider??new HttpProductionFrameProvider();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),150000);
  let generated;
  try{generated=await provider.generate(spec,{signal:controller.signal});}finally{clearTimeout(timeout);}
  if(stale)return "STALE";
  const quality=validateProductionFrameOutput(spec,generated);
  if(!quality.ok)throw new Error(quality.code);
  const uploaded=await uploadProductionFrame(input.supabase,{creatorId:job.creator_id,seriesId:spec.seriesId,storyboardId:spec.storyboardId,frameId:frame.id,generationId:job.id,attemptId:job.attempt_id,bytes:generated.bytes,mimeType:generated.mimeType});
  storagePath=uploaded.storagePath;if(stale){await removeProductionFrame(input.supabase,storagePath);return "STALE";}
  const {data:committed}=await input.supabase.rpc("complete_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_storage_path:uploaded.storagePath,p_output_url:uploaded.url,p_mime_type:generated.mimeType,p_width:generated.width,p_height:generated.height,p_output_checksum:quality.checksum});
  if(committed!==true){await removeProductionFrame(input.supabase,uploaded.storagePath);return "STALE";}
  return "COMPLETED";
 }catch(error){
  if(storagePath)await removeProductionFrame(input.supabase,storagePath);
  await input.supabase.rpc("fail_production_frame_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:errorCode(error)});
  return "FAILED";
 }finally{clearInterval(heartbeat);}
}
