import type {SupabaseClient} from "@supabase/supabase-js";
import {getSeries} from "@/lib/series/persistence/getSeries";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {getDialogueAudioPlan,getDialogueLineStates,materializeDialogueAudioPlan} from "@/lib/dialogue-audio/persistence";
import {getMotionPlan} from "@/lib/motion/persistence";
import {getScene} from "@/lib/scenes/persistence/getScene";
import {getScript} from "@/lib/scripts/persistence/getScript";
import {getVisualPlan} from "@/lib/visual-planning/persistence/getVisualPlan";
import type {SoundSceneContext} from "./types";

export async function loadSoundContext(supabase:SupabaseClient,userId:string,input:{seriesId:string;assemblyId:string;dialoguePlanId:string}){
 const series=await getSeries(supabase,userId,input.seriesId);
 const assembly=await getEpisodeAssembly(supabase,userId,input.assemblyId);
 if(assembly.series_id!==input.seriesId||assembly.status!=="READY")throw new Error("EPISODE_ASSEMBLY_NOT_FOUND");
 const dialogueRow=await getDialogueAudioPlan(supabase,userId,input.dialoguePlanId);
 if(dialogueRow.series_id!==input.seriesId||dialogueRow.episode_assembly_id!==input.assemblyId)throw new Error("DIALOGUE_PLAN_NOT_FOUND");
 const dialogue=materializeDialogueAudioPlan(dialogueRow.plan,await getDialogueLineStates(supabase,userId,dialogueRow.id));
 const{data:links,error}=await supabase.from("episode_assembly_scenes").select("motion_plan_id,scene_order").eq("episode_assembly_id",input.assemblyId).order("scene_order",{ascending:true});
 if(error||!links?.length)throw new Error("EPISODE_SOURCE_NOT_FOUND");
 const scenes:SoundSceneContext[]=[];
 for(const link of links){
   const motion=await getMotionPlan(supabase,userId,link.motion_plan_id);
   if(motion.series_id!==input.seriesId)throw new Error("EPISODE_SOURCE_NOT_FOUND");
   const scene=await getScene(supabase,userId,input.seriesId,motion.scene_id,series.blueprint);
   const script=await getScript(supabase,userId,input.seriesId,motion.scene_id,motion.script_id,series.blueprint,scene.blueprint);
   const visual=await getVisualPlan(supabase,userId,input.seriesId,motion.scene_id,motion.script_id,motion.visual_plan_id,series.blueprint,scene.blueprint,script.script);
   scenes.push({order:link.scene_order,scene:scene.blueprint,script:script.script,visualPlan:visual.plan});
 }
 return{series:series.blueprint,assembly,dialogueRow,dialogue,scenes};
}
