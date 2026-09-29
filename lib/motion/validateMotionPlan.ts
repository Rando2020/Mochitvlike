import type {AnimaticTimeline} from "@/lib/animatics/types";
import type {StoryboardBlueprint} from "@/lib/storyboards/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import {MotionPlanSchema} from "./schema";
import type {MotionPlan} from "./types";

export type MotionValidationResult={success:true;plan:MotionPlan}|{success:false;problems:string[]};

export function validateMotionPlan(input:unknown,animatic:AnimaticTimeline,storyboard:StoryboardBlueprint,visualPlan:VisualPlan,expected:{
  motionPlanId:string;seriesId:string;sceneId:string;scriptId:string;visualPlanId:string;storyboardId:string;animaticId:string;version:number;
}):MotionValidationResult{
  const parsed=MotionPlanSchema.safeParse(input);
  if(!parsed.success)return{success:false,problems:parsed.error.issues.map(i=>i.path.join(".")+": "+i.message)};
  const plan=parsed.data as MotionPlan,problems:string[]=[];
  const pairs:Array<[string,string|number,string|number]>= [
    ["motionPlanId",plan.id,expected.motionPlanId],["seriesId",plan.seriesId,expected.seriesId],["sceneId",plan.sceneId,expected.sceneId],
    ["scriptId",plan.scriptId,expected.scriptId],["visualPlanId",plan.visualPlanId,expected.visualPlanId],["storyboardId",plan.storyboardId,expected.storyboardId],
    ["animaticId",plan.animaticId,expected.animaticId],["version",plan.version,expected.version]
  ];
  for(const [name,a,b] of pairs)if(a!==b)problems.push(name+" mismatch");

  const animById=new Map(animatic.clips.map(c=>[c.id,c]));
  const panelIds=new Set(storyboard.panels.map(p=>p.id));
  const visualIds=new Set(visualPlan.visualBeats.map(v=>v.id));
  const clipIds=new Set<string>();
  if(plan.clips.length!==animatic.clips.length)problems.push("Motion clip count must match Animatic clip count");

  for(const [index,clip] of plan.clips.entries()){
    if(clipIds.has(clip.id))problems.push("duplicate motion clip id "+clip.id);clipIds.add(clip.id);
    if(clip.sequenceIndex!==index)problems.push("motion sequence must be contiguous");
    const source=animById.get(clip.animaticClipId);
    if(!source)problems.push("unknown Animatic clip "+clip.animaticClipId);
    else{
      if(source.panelId!==clip.storyboardPanelId)problems.push("Storyboard panel identity changed");
      if(Math.abs(source.durationSeconds-clip.targetDurationSeconds)>.001)problems.push("Animatic target duration changed");
      if(source.sourceVisualBeatId!==clip.sourceVisualBeatId)problems.push("VisualBeat traceability changed");
      if(JSON.stringify(source.sourceScriptBlockIds)!==JSON.stringify(clip.sourceScriptBlockIds))problems.push("Script traceability changed");
      if(source.asset.url!==clip.inputAsset.url)problems.push("Input Storyboard asset changed");
    }
    if(!panelIds.has(clip.storyboardPanelId))problems.push("unknown Storyboard panel "+clip.storyboardPanelId);
    if(!visualIds.has(clip.sourceVisualBeatId))problems.push("unknown VisualBeat "+clip.sourceVisualBeatId);
    if(clip.generationStatus==="SKIPPED"&&clip.outputAsset!==null)problems.push("SKIPPED clip cannot have generated output");
  }

  return problems.length?{success:false,problems}:{success:true,plan};
}
