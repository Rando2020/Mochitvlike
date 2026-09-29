import {notFound} from "next/navigation";
import {MotionWorkspace} from "@/components/motion/MotionWorkspace";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getMotionPlan,getMotionClipStates,materializeMotionPlan} from "@/lib/motion/persistence";
import {getLatestEpisodeAssembly} from "@/lib/episodes/assembly/persistence";

export default async function MotionPage({params}:{params:Promise<{seriesId:string;sceneId:string;scriptId:string;planId:string;storyboardId:string;animaticId:string;motionPlanId:string}>}){
  const {seriesId,sceneId,scriptId,planId,storyboardId,animaticId,motionPlanId}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user},error}=await supabase.auth.getUser();if(error||!user)notFound();
  try{
    const row=await getMotionPlan(supabase,user.id,motionPlanId);
    if(row.series_id!==seriesId||row.scene_id!==sceneId||row.script_id!==scriptId||row.visual_plan_id!==planId||row.storyboard_id!==storyboardId||row.animatic_id!==animaticId)notFound();
    const plan=materializeMotionPlan(row.plan,await getMotionClipStates(supabase,user.id,motionPlanId));
    const latestAssembly=await getLatestEpisodeAssembly(supabase,user.id,seriesId,"episodeOne");
    const base="/api/series/"+seriesId+"/scenes/"+sceneId+"/scripts/"+scriptId+"/visual-plans/"+planId+"/storyboards/"+storyboardId+"/animatics/"+animaticId+"/motion/"+motionPlanId;
    const assemblyBase="/api/series/"+seriesId+"/episodes/episodeOne";
    return <MotionWorkspace initialPlan={plan} initialStatus={row.status} statusEndpoint={base} retryBase={base} assemblyBase={assemblyBase} latestAssembly={latestAssembly?{id:latestAssembly.id}:null}/>;
  }catch{notFound();}
}
