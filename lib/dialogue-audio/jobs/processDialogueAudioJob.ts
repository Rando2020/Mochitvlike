import type {SupabaseClient} from "@supabase/supabase-js";
import {EpisodeTimelineSchema} from "@/lib/episodes/assembly/schema";
import {SceneScriptSchema} from "@/lib/scripts/schema";
import {VoiceCastSchema,DialogueAudioPlanSchema} from "../schema";
import {buildDialogueAudioSpec} from "../buildDialogueAudioSpec";
import {compileSpeechInstructions} from "../compileSpeechInstructions";
import {checksumText} from "../checksums";
import {classifyDialogueTiming} from "../timing";
import {OpenAIDialogueSpeechProvider} from "../providers/openai";
import {TTSProviderMalformedResponseError,TTSProviderRefusalError,TTSProviderTimeoutError,TTSProviderTransientError} from "../providers/errors";
import type {DialogueSpeechProvider} from "../types";
import {createDialogueAudioQualityValidator} from "../quality";
import {DialogueAudioStorageError,removeDialogueAudio,uploadDialogueAudio} from "../storage";

function log(event:string,data:Record<string,unknown>){console.info(JSON.stringify({event,...data}));}
function mapError(error:unknown){
  if(error instanceof TTSProviderTimeoutError)return"TTS_PROVIDER_TIMEOUT";
  if(error instanceof TTSProviderRefusalError)return"TTS_GENERATION_DECLINED";
  if(error instanceof TTSProviderMalformedResponseError)return error.message==="VOICE_ASSIGNMENT_INVALID"?"VOICE_ASSIGNMENT_INVALID":"INVALID_TTS_RESPONSE";
  if(error instanceof DialogueAudioStorageError)return"DIALOGUE_AUDIO_STORAGE_FAILED";
  if(error instanceof TTSProviderTransientError)return"INTERNAL_TRANSIENT";
  if(error instanceof Error&&error.message==="DIALOGUE_TEXT_MISMATCH")return"DIALOGUE_TEXT_MISMATCH";
  return"INTERNAL_TRANSIENT";
}
async function authoritativeScriptText(supabase:SupabaseClient,input:{episodeAssemblyId:string;scriptBlockId:string;characterId:string;creatorId:string}){
  const {data:links,error}=await supabase.from("episode_assembly_scenes").select("motion_plan_id").eq("episode_assembly_id",input.episodeAssemblyId);
  if(error||!links?.length)throw new Error("DIALOGUE_TEXT_MISMATCH");
  for(const link of links){
    const {data:motion}=await supabase.from("motion_plans").select("script_id").eq("id",link.motion_plan_id).eq("creator_id",input.creatorId).maybeSingle();if(!motion)continue;
    const {data:scriptRow}=await supabase.from("scene_scripts").select("script").eq("id",motion.script_id).eq("creator_id",input.creatorId).maybeSingle();if(!scriptRow)continue;
    const parsed=SceneScriptSchema.safeParse(scriptRow.script);if(!parsed.success)continue;
    const block=parsed.data.blocks.find(b=>b.id===input.scriptBlockId);
    if(block?.type==="DIALOGUE"&&block.characterId===input.characterId)return block.text;
  }
  throw new Error("DIALOGUE_TEXT_MISMATCH");
}

export async function processDialogueAudioJob(input:{supabase:SupabaseClient;jobId:string;claimToken:string;provider?:DialogueSpeechProvider}):Promise<"COMPLETED"|"FAILED"|"STALE">{
  const started=Date.now();
  const {data:job,error:jobError}=await input.supabase.from("dialogue_audio_generations")
    .select("id,dialogue_plan_id,line_id,script_block_id,character_id,creator_id,status,provider,model,provider_voice_id,instruction_checksum,instruction_version,text_checksum,episode_start_seconds,visual_window_seconds,attempt_id,claim_token")
    .eq("id",input.jobId).maybeSingle();
  if(jobError||!job||job.status!=="GENERATING"||job.claim_token!==input.claimToken||!job.attempt_id){
    log("dialogue_audio_stale_delivery",{jobId:input.jobId,status:"STALE"});return"STALE";
  }
  log("dialogue_audio_worker_started",{jobId:job.id,creatorId:job.creator_id,provider:job.provider,model:job.model,textChecksum:job.text_checksum,status:job.status});

  const {data:planRow}=await input.supabase.from("dialogue_audio_plans").select("id,episode_assembly_id,voice_cast_id,plan").eq("id",job.dialogue_plan_id).eq("creator_id",job.creator_id).maybeSingle();
  if(!planRow)return"STALE";
  const p=DialogueAudioPlanSchema.safeParse(planRow.plan);if(!p.success)return"STALE";
  const {data:castRow}=await input.supabase.from("voice_casts").select("cast").eq("id",planRow.voice_cast_id).eq("creator_id",job.creator_id).maybeSingle();
  const c=VoiceCastSchema.safeParse(castRow?.cast);if(!c.success)return"STALE";
  const line=p.data.lines.find(l=>l.id===job.line_id);if(!line)return"STALE";

  const {data:episodeRow}=await input.supabase.from("episode_assemblies").select("timeline").eq("id",planRow.episode_assembly_id).eq("creator_id",job.creator_id).maybeSingle();
  const ep=EpisodeTimelineSchema.safeParse(episodeRow?.timeline);if(!ep.success)return"STALE";
  const cue=ep.data.scenes.flatMap(s=>s.clips.flatMap(cl=>cl.dialogueCues)).find(d=>d.scriptBlockId===job.script_block_id&&d.characterId===job.character_id);
  if(!cue||cue.text!==line.text||checksumText(cue.text)!==job.text_checksum||checksumText(line.text)!==job.text_checksum){
    await input.supabase.rpc("fail_dialogue_audio_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"DIALOGUE_TEXT_MISMATCH"});return"FAILED";
  }
  const sourceText=await authoritativeScriptText(input.supabase,{episodeAssemblyId:planRow.episode_assembly_id,scriptBlockId:job.script_block_id,characterId:job.character_id,creatorId:job.creator_id}).catch(()=>null);
  if(sourceText!==line.text||checksumText(sourceText??"")!==job.text_checksum){
    await input.supabase.rpc("fail_dialogue_audio_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"DIALOGUE_TEXT_MISMATCH"});return"FAILED";
  }

  const spec=buildDialogueAudioSpec(p.data,c.data,line.id),compiled=compileSpeechInstructions(spec);
  const provider=input.provider??new OpenAIDialogueSpeechProvider();
  if(job.provider!==provider.name||job.model!==provider.model||job.provider_voice_id!==spec.voice.providerVoiceId||compiled.checksum!==job.instruction_checksum||compiled.version!==job.instruction_version){
    await input.supabase.rpc("fail_dialogue_audio_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:"VOICE_ASSIGNMENT_INVALID"});return"FAILED";
  }

  let stale=false;
  const heartbeat=setInterval(async()=>{const {data}=await input.supabase.rpc("renew_dialogue_audio_generation_lease",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_lease_seconds:180});if(data!==true)stale=true;},45000);
  let storagePath:string|null=null;
  try{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000);
    let audio;try{audio=await provider.generate({text:spec.text,voiceId:spec.voice.providerVoiceId,instructions:compiled.instructions,responseFormat:"wav",signal:controller.signal});}finally{clearTimeout(timeout);}
    if(stale)return"STALE";
    const quality=await createDialogueAudioQualityValidator().validate({audio});if(!quality.ok)throw new TTSProviderMalformedResponseError();
    const timing=classifyDialogueTiming(audio.durationSeconds,spec.timingContext.visualWindowSeconds);
    const uploaded=await uploadDialogueAudio(input.supabase,{creatorId:job.creator_id,planId:p.data.id,lineId:line.id,attemptId:job.attempt_id,bytes:audio.bytes});storagePath=uploaded.storagePath;
    if(stale){await removeDialogueAudio(input.supabase,storagePath);return"STALE";}
    const {data:committed}=await input.supabase.rpc("complete_dialogue_audio_generation",{
      p_job_id:input.jobId,p_claim_token:input.claimToken,p_storage_path:uploaded.storagePath,p_asset_url:uploaded.url,p_output_duration_seconds:audio.durationSeconds,
      p_sample_rate:audio.sampleRate,p_channels:audio.channels,p_mime_type:audio.mimeType,p_timing_difference_seconds:timing.differenceSeconds,p_timing_fit:timing.fit
    });
    if(committed!==true){await removeDialogueAudio(input.supabase,storagePath);return"STALE";}
    log("dialogue_audio_worker_completed",{jobId:job.id,creatorId:job.creator_id,provider:job.provider,model:job.model,textChecksum:job.text_checksum,durationMs:Date.now()-started,status:"COMPLETED"});
    return"COMPLETED";
  }catch(error){
    if(storagePath)await removeDialogueAudio(input.supabase,storagePath);
    if(stale)return"STALE";
    const code=mapError(error);
    await input.supabase.rpc("fail_dialogue_audio_generation",{p_job_id:input.jobId,p_claim_token:input.claimToken,p_error_code:code});
    log("dialogue_audio_worker_failed",{jobId:job.id,creatorId:job.creator_id,provider:job.provider,model:job.model,textChecksum:job.text_checksum,durationMs:Date.now()-started,status:"FAILED",errorCode:code});
    return"FAILED";
  }finally{clearInterval(heartbeat);}
}
