import {notFound} from "next/navigation";
import {VisualPlanningWorkspace} from "@/components/visual-planning/VisualPlanningWorkspace";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {listVisualPlans} from "@/lib/visual-planning/persistence/listVisualPlans";
import {VisualPlanPersistenceError} from "@/lib/visual-planning/persistence/types";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getLatestStoryboard,getPanelStates} from "@/lib/storyboards/persistence";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export default async function VisualPlanPage({params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string}>}){
 const {seriesId,sceneId,scriptId,planId}=await params;const supabase=await createServerSupabaseClient();
 const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
 try{
  const series=await getSeries(supabase,user.id,seriesId);const scene=await getScene(supabase,user.id,seriesId,sceneId,series.blueprint);
  const script=await getScript(supabase,user.id,seriesId,sceneId,scriptId,series.blueprint,scene.blueprint);
  const [visualPlan,versions]=await Promise.all([getVisualPlan(supabase,user.id,seriesId,sceneId,scriptId,planId,series.blueprint,scene.blueprint,script.script),listVisualPlans(supabase,user.id,seriesId,sceneId,scriptId)]);
  const storyboard=await getLatestStoryboard(supabase,user.id,planId);
  const states=storyboard?await getPanelStates(supabase,user.id,storyboard.id):[];
  return <VisualPlanningWorkspace plan={visualPlan.plan} versions={versions} script={script.script} series={series.blueprint}
   latestStoryboard={storyboard?{id:storyboard.id,status:storyboard.status,panelCount:storyboard.blueprint.panels.length,completedPanels:states.filter(s=>s.status==="COMPLETED").length}:null}/>;
 }catch(caught){if(caught instanceof VisualPlanPersistenceError&&caught.code==="VISUAL_PLAN_NOT_FOUND")notFound();throw caught;}
}
