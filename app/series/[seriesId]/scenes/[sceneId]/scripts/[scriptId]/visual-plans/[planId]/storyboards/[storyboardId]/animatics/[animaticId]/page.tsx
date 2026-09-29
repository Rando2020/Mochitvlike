import {notFound} from "next/navigation";
import {AnimaticWorkspace} from "@/components/animatics/AnimaticWorkspace";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import {getStoryboard,getPanelStates,materializeStoryboard} from "@/lib/storyboards/persistence";
import {getAnimatic} from "@/lib/animatics/persistence";
import {getLatestMotionPlan} from "@/lib/motion/persistence";

export default async function AnimaticPage({params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string;animaticId:string}>}){
  const {seriesId,sceneId,scriptId,planId,storyboardId,animaticId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
  try{
    const series=await getSeries(supabase,user.id,seriesId);
    const scene=await getScene(supabase,user.id,seriesId,sceneId,series.blueprint);
    const script=await getScript(supabase,user.id,seriesId,sceneId,scriptId,series.blueprint,scene.blueprint);
    const visualPlan=await getVisualPlan(supabase,user.id,seriesId,sceneId,scriptId,planId,series.blueprint,scene.blueprint,script.script);
    const storyboardRow=await getStoryboard(supabase,user.id,storyboardId);
    const storyboard=materializeStoryboard(storyboardRow.blueprint,await getPanelStates(supabase,user.id,storyboardId));
    const animatic=await getAnimatic(supabase,user.id,animaticId,script.script,visualPlan.plan,storyboard);
    if(animatic.storyboardId!==storyboardId)notFound();
    const latestMotionPlan=await getLatestMotionPlan(supabase,user.id,animaticId);
    const motionBase="/api/series/"+seriesId+"/scenes/"+sceneId+"/scripts/"+scriptId+"/visual-plans/"+planId+"/storyboards/"+storyboardId+"/animatics/"+animaticId;
    return <AnimaticWorkspace timeline={animatic.timeline} series={series.blueprint} motionBase={motionBase} latestMotionPlan={latestMotionPlan?{id:latestMotionPlan.id}:null}/>;
  }catch{notFound();}
}
