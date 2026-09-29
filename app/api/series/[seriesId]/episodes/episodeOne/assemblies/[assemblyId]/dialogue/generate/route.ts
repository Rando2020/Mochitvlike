import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {buildVoiceCast} from "@/lib/dialogue-audio/selectVoiceCast";
import {compileDialogueAudioPlan} from "@/lib/dialogue-audio/compileDialogueAudioPlan";
import {validateDialogueAudioPlan} from "@/lib/dialogue-audio/validateDialogueAudioPlan";
import {buildDialogueAudioSpec} from "@/lib/dialogue-audio/buildDialogueAudioSpec";
import {compileSpeechInstructions} from "@/lib/dialogue-audio/compileSpeechInstructions";
import {getLatestDialogueAudioPlan,getVoiceCast} from "@/lib/dialogue-audio/persistence";

const Body=z.object({mode:z.literal("INITIAL")}).strict();
const Uuid=z.string().uuid();
const fail=(status:number,code:string)=>NextResponse.json({error:{code}},{status});

export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string;assemblyId:string}>}){
  const {seriesId,assemblyId}=await params;
  if(!Uuid.safeParse(seriesId).success||!Uuid.safeParse(assemblyId).success)return fail(404,"EPISODE_ASSEMBLY_NOT_FOUND");
  let body:unknown;try{body=await request.json();}catch{return fail(400,"INVALID_DIALOGUE_AUDIO_REQUEST");}
  if(!Body.safeParse(body).success)return fail(400,"INVALID_DIALOGUE_AUDIO_REQUEST");

  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return fail(401,"UNAUTHENTICATED");

  try{
    const series=await getSeries(supabase,user.id,seriesId);
    const assembly=await getEpisodeAssembly(supabase,user.id,assemblyId);
    if(assembly.series_id!==seriesId||assembly.episode_key!=="episodeOne"||assembly.status!=="READY")return fail(404,"EPISODE_ASSEMBLY_NOT_FOUND");
    const cues=assembly.timeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues));
    if(!cues.length)return fail(422,"EPISODE_HAS_NO_DIALOGUE");

    const existing=await getLatestDialogueAudioPlan(supabase,user.id,assemblyId);
    if(existing){
      const cast=await getVoiceCast(supabase,user.id,existing.voice_cast_id);
      return NextResponse.json({dialogue:{id:existing.id,status:existing.status,version:existing.version,voiceCast:cast.cast}},{status:existing.status==="READY"?200:202});
    }

    const voiceCastId=randomUUID(),planId=randomUUID();
    const voiceCast=buildVoiceCast({voiceCastId,seriesId,episodeAssemblyId:assemblyId,version:1,series:series.blueprint,timeline:assembly.timeline});
    const plan=compileDialogueAudioPlan({planId,seriesId,episodeAssemblyId:assemblyId,voiceCast,timeline:assembly.timeline,version:1});
    const valid=validateDialogueAudioPlan({series:series.blueprint,timeline:assembly.timeline,voiceCast,plan});
    if(!valid.success)return fail(422,"DIALOGUE_AUDIO_VALIDATION_FAILED");

    const provider="openai",model=process.env.OPENAI_TTS_MODEL??"gpt-4o-mini-tts";
    const jobs=plan.lines.map(line=>{
      const spec=buildDialogueAudioSpec(plan,voiceCast,line.id),instructions=compileSpeechInstructions(spec);
      return{
        id:randomUUID(),line_id:line.id,script_block_id:line.scriptBlockId,character_id:line.characterId,
        provider,model,provider_voice_id:spec.voice.providerVoiceId,instruction_checksum:instructions.checksum,instruction_version:instructions.version,
        text_checksum:line.textChecksum,episode_start_seconds:line.episodeStartSeconds,visual_window_seconds:line.visualWindowSeconds
      };
    });
    const admin=createAdminSupabaseClient();
    const {data:created,error:createError}=await admin.rpc("create_dialogue_audio_plan",{
      p_voice_cast_id:voiceCastId,p_dialogue_plan_id:planId,p_creator_id:user.id,p_series_id:seriesId,p_episode_assembly_id:assemblyId,p_version:1,
      p_cast:voiceCast,p_plan:plan,p_jobs:jobs
    });
    if(createError)return fail(500,"DIALOGUE_AUDIO_PERSISTENCE_FAILED");
    if(created!==true){
      const raced=await getLatestDialogueAudioPlan(supabase,user.id,assemblyId);
      if(!raced)return fail(409,"DIALOGUE_AUDIO_PERSISTENCE_RACE");
      const cast=await getVoiceCast(supabase,user.id,raced.voice_cast_id);
      return NextResponse.json({dialogue:{id:raced.id,status:raced.status,version:raced.version,voiceCast:cast.cast}},{status:202});
    }
    return NextResponse.json({dialogue:{id:planId,status:"GENERATING",version:1,voiceCast}},{status:202});
  }catch{return fail(404,"EPISODE_ASSEMBLY_NOT_FOUND");}
}
