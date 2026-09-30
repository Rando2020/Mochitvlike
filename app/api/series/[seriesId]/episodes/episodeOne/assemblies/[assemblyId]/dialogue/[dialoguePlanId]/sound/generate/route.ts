import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createAdminSupabaseClient} from "@/lib/supabase/admin";
import {loadSoundContext} from "@/lib/sound-design/loadSoundContext";
import {compileSoundDesignPlan} from "@/lib/sound-design/compileSoundDesignPlan";
import {validateSoundDesignPlan} from "@/lib/sound-design/validateSoundDesignPlan";
import {getLatestSoundDesignPlan} from "@/lib/sound-design/persistence";
import {EnvironmentSoundLibraryProvider} from "@/lib/sound-design/library";
import {buildMusicGenerationPrompt,buildEffectGenerationPrompt} from "@/lib/sound-design/prompts";
import {ElevenLabsMusicProvider,ElevenLabsSoundEffectProvider} from "@/lib/sound-design/providers/elevenlabs";

const Body=z.object({mode:z.literal("INITIAL")}).strict();
const fail=(status:number,code:string)=>NextResponse.json({error:{code}},{status});
export async function POST(request:NextRequest,{params}:{params:Promise<{seriesId:string;assemblyId:string;dialoguePlanId:string}>}){
 const ids=await params;let body:unknown;try{body=await request.json();}catch{return fail(400,"INVALID_SOUND_REQUEST");}if(!Body.safeParse(body).success)return fail(400,"INVALID_SOUND_REQUEST");
 const supabase=await createServerSupabaseClient();const{data:{user},error}=await supabase.auth.getUser();if(error||!user)return fail(401,"UNAUTHENTICATED");
 try{
   const ctx=await loadSoundContext(supabase,user.id,ids);
   if(ctx.dialogueRow.status==="GENERATING"||ctx.dialogueRow.status==="FAILED")return fail(409,"DIALOGUE_AUDIO_INCOMPLETE");
   const existing=await getLatestSoundDesignPlan(supabase,user.id,ids.assemblyId);
   if(existing)return NextResponse.json({sound:{id:existing.id,status:existing.status,version:existing.version}},{status:existing.status==="READY"?200:202});

   const planId=randomUUID(),plan=compileSoundDesignPlan({planId,series:ctx.series,episode:ctx.assembly.timeline,dialogue:ctx.dialogue,scenes:ctx.scenes,version:1});
   const valid=validateSoundDesignPlan({plan,series:ctx.series,episode:ctx.assembly.timeline,dialogue:ctx.dialogue,scenes:ctx.scenes});if(!valid.success)return fail(422,"SOUND_PLAN_VALIDATION_FAILED");
   const library=new EnvironmentSoundLibraryProvider(),music=new ElevenLabsMusicProvider(),effects=new ElevenLabsSoundEffectProvider();
   const jobs=[];
   for(const cue of plan.cues){
     if(cue.type==="SILENCE")continue;
     const compiled=cue.type==="MUSIC"?buildMusicGenerationPrompt(cue):buildEffectGenerationPrompt(cue);
     const libraryAsset=await library.resolve(cue);
     const requested=cue.type==="AMBIENCE"&&cue.loopable?Math.min(30,cue.durationSeconds):cue.type==="MUSIC"?Math.max(3,cue.durationSeconds):Math.max(.5,Math.min(30,cue.durationSeconds));
     jobs.push({
       id:randomUUID(),cue_id:cue.id,cue_type:cue.type,status:libraryAsset?"LIBRARY":"PENDING",
       provider:libraryAsset?"library":cue.type==="MUSIC"?music.name:effects.name,
       model:libraryAsset?"static-library-v1":cue.type==="MUSIC"?music.model:effects.model,
       instruction_checksum:compiled.checksum,instruction_version:compiled.version,requested_duration_seconds:requested,loopable:cue.type==="AMBIENCE"&&cue.loopable,
       storage_path:libraryAsset?.storagePath??null,asset_url:libraryAsset?.url??null,mime_type:libraryAsset?.mimeType??null,output_duration_seconds:libraryAsset?.durationSeconds??null,duration_source:libraryAsset?"REQUESTED":null
     });
   }
   const admin=createAdminSupabaseClient();const{data:created,error:createError}=await admin.rpc("create_sound_design_plan",{p_plan_id:planId,p_creator_id:user.id,p_series_id:ids.seriesId,p_episode_assembly_id:ids.assemblyId,p_dialogue_plan_id:ids.dialoguePlanId,p_version:1,p_plan:plan,p_jobs:jobs});
   if(createError)return fail(500,"SOUND_PERSISTENCE_FAILED");
   if(created!==true){const raced=await getLatestSoundDesignPlan(supabase,user.id,ids.assemblyId);if(!raced)return fail(409,"SOUND_PERSISTENCE_RACE");return NextResponse.json({sound:{id:raced.id,status:raced.status,version:raced.version}},{status:raced.status==="READY"?200:202});}
   return NextResponse.json({sound:{id:planId,status:jobs.some(j=>j.status==="PENDING")?"GENERATING":"READY",version:1}},{status:jobs.some(j=>j.status==="PENDING")?202:200});
 }catch{return fail(404,"SOUND_PARENT_NOT_FOUND");}
}
