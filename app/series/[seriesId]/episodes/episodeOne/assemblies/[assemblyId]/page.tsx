import {notFound} from "next/navigation";
import {EpisodeAssemblyWorkspace} from "@/components/episodes/EpisodeAssemblyWorkspace";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";

export default async function EpisodeAssemblyPage({params}:{params:Promise<{seriesId:string;assemblyId:string}>}){
  const {seriesId,assemblyId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
  try{
    const assembly=await getEpisodeAssembly(supabase,user.id,assemblyId);
    if(assembly.series_id!==seriesId||assembly.episode_key!=="episodeOne")notFound();
    return <EpisodeAssemblyWorkspace timeline={assembly.timeline}/>;
  }catch{notFound();}
}
