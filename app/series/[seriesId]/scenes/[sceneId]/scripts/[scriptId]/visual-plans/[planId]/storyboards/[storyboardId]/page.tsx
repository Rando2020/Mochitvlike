import {notFound} from "next/navigation";
import {StoryboardWorkspace} from "@/components/storyboards/StoryboardWorkspace";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";

export default async function StoryboardPage({params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string}>}){
 const {seriesId,sceneId,scriptId,planId,storyboardId}=await params;const supabase=await createServerSupabaseClient();
 const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
 try{
  const series=await getSeries(supabase,user.id,seriesId);const scene=await getScene(supabase,user.id,seriesId,sceneId,series.blueprint);
  const script=await getScript(supabase,user.id,seriesId,sceneId,scriptId,series.blueprint,scene.blueprint);
  await getVisualPlan(supabase,user.id,seriesId,sceneId,scriptId,planId,series.blueprint,scene.blueprint,script.script);
  const storyboard=await getStoryboard(supabase,user.id,storyboardId);
  if(storyboard.visual_plan_id!==planId)notFound();
  const states=await getPanelStates(supabase,user.id,storyboardId);
  const effective=materializeStoryboard(storyboard.blueprint,states);
  const base=`/api/series/${seriesId}/scenes/${sceneId}/scripts/${scriptId}/visual-plans/${planId}/storyboards/${storyboardId}`;
  return <StoryboardWorkspace initialStoryboard={effective} initialStatus={storyboard.status} statusEndpoint={base} retryBase={base} script={script.script} series={series.blueprint}/>;
 }catch{notFound();}
}
