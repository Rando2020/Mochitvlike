import {notFound} from "next/navigation";
import {DialogueAudioWorkspace} from "@/components/dialogue-audio/DialogueAudioWorkspace";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {getDialogueAudioPlan,getDialogueLineStates,getVoiceCast,materializeDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";
import {getLatestSoundDesignPlan} from "@/lib/sound-design/persistence";

export default async function DialogueAudioPage({params}:{params:Promise<{seriesId:string;assemblyId:string;dialoguePlanId:string}>}){
  const {seriesId,assemblyId,dialoguePlanId}=await params;
  const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
  try{
    const assembly=await getEpisodeAssembly(supabase,user.id,assemblyId);if(assembly.series_id!==seriesId)notFound();
    const row=await getDialogueAudioPlan(supabase,user.id,dialoguePlanId);if(row.series_id!==seriesId||row.episode_assembly_id!==assemblyId)notFound();
    const cast=await getVoiceCast(supabase,user.id,row.voice_cast_id);
    const plan=materializeDialogueAudioPlan(row.plan,await getDialogueLineStates(supabase,user.id,row.id));
    const base="/api/series/"+seriesId+"/episodes/episodeOne/assemblies/"+assemblyId+"/dialogue/"+dialoguePlanId;
    const latestSound=await getLatestSoundDesignPlan(supabase,user.id,assemblyId);
    return <DialogueAudioWorkspace timeline={assembly.timeline} initialPlan={plan} initialStatus={row.status} voiceCast={cast.cast} statusEndpoint={base} retryBase={base} soundBase={base} latestSound={latestSound?{id:latestSound.id}:null}/>;
  }catch{notFound();}
}
