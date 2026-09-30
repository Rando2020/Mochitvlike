import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {getDialogueAudioPlan,getDialogueLineStates,materializeDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";
import {getSoundDesignPlan,getSoundCueStates,materializeSoundDesignPlan} from "@/lib/sound-design/persistence";
import {buildEpisodeMixTimeline} from "@/lib/sound-design/mix";

export async function GET(_request:NextRequest,{params}:{params:Promise<{seriesId:string;assemblyId:string;dialoguePlanId:string;soundPlanId:string}>}){
 const ids=await params,supabase=await createServerSupabaseClient();const{data:{user},error}=await supabase.auth.getUser();if(error||!user)return NextResponse.json({error:{code:"UNAUTHENTICATED"}},{status:401});
 try{
   const episode=await getEpisodeAssembly(supabase,user.id,ids.assemblyId);if(episode.series_id!==ids.seriesId)return NextResponse.json({error:{code:"SOUND_PLAN_NOT_FOUND"}},{status:404});
   const dialogueRow=await getDialogueAudioPlan(supabase,user.id,ids.dialoguePlanId);if(dialogueRow.episode_assembly_id!==ids.assemblyId)return NextResponse.json({error:{code:"SOUND_PLAN_NOT_FOUND"}},{status:404});
   const dialogue=materializeDialogueAudioPlan(dialogueRow.plan,await getDialogueLineStates(supabase,user.id,dialogueRow.id));
   const row=await getSoundDesignPlan(supabase,user.id,ids.soundPlanId);if(row.series_id!==ids.seriesId||row.episode_assembly_id!==ids.assemblyId||row.dialogue_plan_id!==ids.dialoguePlanId)return NextResponse.json({error:{code:"SOUND_PLAN_NOT_FOUND"}},{status:404});
   const states=await getSoundCueStates(supabase,user.id,row.id),plan=materializeSoundDesignPlan(row.plan,states),warnings=[...plan.validation.warnings];
   for(const cue of plan.cues){if(cue.type==="SILENCE")continue;const state=states.find(s=>s.cueId===cue.id);if(state?.asset&&state.asset.durationSeconds>cue.durationSeconds+.1)warnings.push((cue.type==="MUSIC"?"Music":"Sound")+" tail exceeds its cue by "+(state.asset.durationSeconds-cue.durationSeconds).toFixed(1)+"s and will be preview-trimmed.");if(state?.asset&&state.asset.durationSeconds+0.1<cue.durationSeconds&&!(cue.type==="AMBIENCE"&&cue.loopable))warnings.push(cue.type+" asset is shorter than its required window.");}
   return NextResponse.json({sound:{id:row.id,status:row.status,version:row.version,plan:{...plan,validation:{...plan.validation,warnings:[...new Set(warnings)]}},states,mix:buildEpisodeMixTimeline({episode:episode.timeline,dialogue,plan,states}),pollAfterMs:row.status==="GENERATING"?1800:null}},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:{code:"SOUND_PLAN_NOT_FOUND"}},{status:404});}
}
