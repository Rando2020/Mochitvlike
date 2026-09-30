import {notFound} from "next/navigation";
import {EpisodeAssemblyWorkspace} from "@/components/episodes/EpisodeAssemblyWorkspace";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {getLatestDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";

export default async function EpisodeAssemblyPage({params}:{params:Promise<{seriesId:string;assemblyId:string}>}){
  const {seriesId,assemblyId}=await params;
  const supabase=await createServerSupabaseClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
  try{
    const assembly=await getEpisodeAssembly(supabase,user.id,assemblyId);
    if(assembly.series_id!==seriesId||assembly.episode_key!=="episodeOne")notFound();
    const latest=await getLatestDialogueAudioPlan(supabase,user.id,assemblyId);
    const dialogueBase="/api/series/"+seriesId+"/episodes/episodeOne/assemblies/"+assemblyId;
    return <EpisodeAssemblyWorkspace timeline={assembly.timeline} dialogueBase={dialogueBase} latestDialogue={latest?{id:latest.id}:null}/>;
  }catch{notFound();}
}
