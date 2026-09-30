import {notFound} from "next/navigation";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {getDialogueAudioPlan,getDialogueLineStates,materializeDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";
import {getSoundDesignPlan,getSoundCueStates,materializeSoundDesignPlan} from "@/lib/sound-design/persistence";
import {buildEpisodeMixTimeline} from "@/lib/sound-design/mix";
import {EpisodeSoundWorkspace} from "@/components/sound-design/EpisodeSoundWorkspace";

export default async function SoundPage({params}:{params:Promise<{seriesId:string;assemblyId:string;dialoguePlanId:string;soundPlanId:string}>}){
 const ids=await params,supabase=await createServerSupabaseClient();const{data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
 try{
  const episode=await getEpisodeAssembly(supabase,user.id,ids.assemblyId);if(episode.series_id!==ids.seriesId)notFound();
  const dialogueRow=await getDialogueAudioPlan(supabase,user.id,ids.dialoguePlanId);if(dialogueRow.episode_assembly_id!==ids.assemblyId)notFound();
  const dialogue=materializeDialogueAudioPlan(dialogueRow.plan,await getDialogueLineStates(supabase,user.id,dialogueRow.id));
  const row=await getSoundDesignPlan(supabase,user.id,ids.soundPlanId);if(row.episode_assembly_id!==ids.assemblyId||row.dialogue_plan_id!==ids.dialoguePlanId)notFound();
  const states=await getSoundCueStates(supabase,user.id,row.id),plan=materializeSoundDesignPlan(row.plan,states),mix=buildEpisodeMixTimeline({episode:episode.timeline,dialogue,plan,states});
  const base="/api/series/"+ids.seriesId+"/episodes/episodeOne/assemblies/"+ids.assemblyId+"/dialogue/"+ids.dialoguePlanId+"/sound/"+ids.soundPlanId;
  return <EpisodeSoundWorkspace timeline={episode.timeline} dialogue={dialogue} initialPlan={plan} initialStates={states} initialMix={mix} initialStatus={row.status} statusEndpoint={base} retryBase={base}/>;
 }catch{notFound();}
}
