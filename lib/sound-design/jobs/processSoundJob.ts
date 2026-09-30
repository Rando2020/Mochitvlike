import type {SupabaseClient} from "@supabase/supabase-js";
import {SoundDesignPlanSchema} from "../schema";
import {buildMusicGenerationPrompt,buildEffectGenerationPrompt} from "../prompts";
import {ElevenLabsMusicProvider,ElevenLabsSoundEffectProvider} from "../providers/elevenlabs";
import {SoundProviderMalformedResponseError,SoundProviderRefusalError,SoundProviderTimeoutError,SoundProviderTransientError} from "../providers/errors";
import {TechnicalMusicQualityValidator,TechnicalSoundEffectQualityValidator} from "../quality";
import {SoundStorageError,uploadSoundAsset,removeSoundAsset} from "../storage";
import type {MusicGenerationProvider,SoundEffectProvider} from "../types";

function log(event:string,data:Record<string,unknown>){console.info(JSON.stringify({event,...data}));}
function errorCode(error:unknown){
 if(error instanceof SoundProviderTimeoutError)return"SOUND_PROVIDER_TIMEOUT";
 if(error instanceof SoundProviderRefusalError)return"SOUND_GENERATION_DECLINED";
 if(error instanceof SoundProviderMalformedResponseError)return"INVALID_SOUND_RESPONSE";
 if(error instanceof SoundStorageError)return"SOUND_STORAGE_FAILED";
 if(error instanceof SoundProviderTransientError)return"INTERNAL_TRANSIENT";
 return"INTERNAL_TRANSIENT";
}
export async function processSoundJob(input:{supabase:SupabaseClient;jobId:string;claimToken:string;musicProvider?:MusicGenerationProvider;effectProvider?:SoundEffectProvider}):Promise<"COMPLETED"|"FAILED"|"STALE">{
 const started=Date.now();
 const{data:job,error}=await input.supabase.from("sound_audio_generations").select("id,sound_plan_id,cue_id,cue_type,creator_id,status,provider,model,instruction_checksum,instruction_version,requested_duration_seconds,loopable,attempt_id,claim_token").eq("id",input.jobId).maybeSingle();
 if(error||!job||job.status!=="GENERATING"||job.claim_token!==input.claimToken||!job.attempt_id){log("sound_job_stale_delivery",{jobId:input.jobId,status:"STALE"});return"STALE";}
 const{data:planRow}=await input.supabase.from("sound_design_plans").select("plan").eq("id",job.sound_plan_id).eq("creator_id",job.creator_id).maybeSingle();
 const parsed=SoundDesignPlanSchema.safeParse(planRow?.plan);if(!parsed.success)return"STALE";
 const cue=parsed.data.cues.find(c=>c.id===job.cue_id);if(!cue||cue.type==="SILENCE"||cue.type!==job.cue_type)return"STALE";
 const compiled=cue.type==="MUSIC"?buildMusicGenerationPrompt(cue):buildEffectGenerationPrompt(cue);
 const provider=cue.type==="MUSIC"?(input.musicProvider??new ElevenLabsMusicProvider()):(input.effectProvider??new ElevenLabsSoundEffectProvider());
 if(provider.name!==job.provider||provider.model!==job.model||compiled.checksum!==job.instruction_checksum||compiled.version!==job.instruction_version){
   await input.supabase.rpc("fail_sound_generation",{p_job_id:job.id,p_claim_token:input.claimToken,p_error_code:"SOUND_SPEC_MISMATCH"});return"FAILED";
 }
 log("sound_job_worker_started",{jobId:job.id,creatorId:job.creator_id,provider:job.provider,model:job.model,cueType:cue.type,status:job.status});
 let stale=false,storagePath:string|null=null;
 const heartbeat=setInterval(async()=>{const{data}=await input.supabase.rpc("renew_sound_generation_lease",{p_job_id:job.id,p_claim_token:input.claimToken,p_lease_seconds:180});if(data!==true)stale=true;},45000);
 try{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),90000);let audio;
   try{
     audio=cue.type==="MUSIC"
       ?await(provider as MusicGenerationProvider).generate({prompt:compiled.prompt,durationSeconds:Number(job.requested_duration_seconds),signal:controller.signal})
       :await(provider as SoundEffectProvider).generate({prompt:compiled.prompt,durationSeconds:Number(job.requested_duration_seconds),loop:!!job.loopable,signal:controller.signal});
   }finally{clearTimeout(timeout);}
   if(stale)return"STALE";
   const quality=cue.type==="MUSIC"?await new TechnicalMusicQualityValidator().validate({audio}):await new TechnicalSoundEffectQualityValidator().validate({audio});
   if(!quality.ok)throw new SoundProviderMalformedResponseError();
   const uploaded=await uploadSoundAsset(input.supabase,{creatorId:job.creator_id,planId:job.sound_plan_id,cueId:job.cue_id,attemptId:job.attempt_id,bytes:audio.bytes});storagePath=uploaded.storagePath;
   if(stale){await removeSoundAsset(input.supabase,storagePath);return"STALE";}
   const{data:committed}=await input.supabase.rpc("complete_sound_generation",{p_job_id:job.id,p_claim_token:input.claimToken,p_storage_path:uploaded.storagePath,p_asset_url:uploaded.url,p_mime_type:audio.mimeType,p_output_duration_seconds:audio.durationSeconds,p_duration_source:audio.durationSource});
   if(committed!==true){await removeSoundAsset(input.supabase,storagePath);return"STALE";}
   log("sound_job_worker_completed",{jobId:job.id,creatorId:job.creator_id,provider:job.provider,model:job.model,cueType:cue.type,durationMs:Date.now()-started,status:"COMPLETED"});return"COMPLETED";
 }catch(e){
   if(storagePath)await removeSoundAsset(input.supabase,storagePath);if(stale)return"STALE";
   const code=errorCode(e);await input.supabase.rpc("fail_sound_generation",{p_job_id:job.id,p_claim_token:input.claimToken,p_error_code:code});
   log("sound_job_worker_failed",{jobId:job.id,creatorId:job.creator_id,provider:job.provider,model:job.model,cueType:cue.type,durationMs:Date.now()-started,status:"FAILED",errorCode:code});return"FAILED";
 }finally{clearInterval(heartbeat);}
}
