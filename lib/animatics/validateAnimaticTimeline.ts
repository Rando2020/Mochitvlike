import type {SceneScript} from "@/lib/scripts/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {StoryboardBlueprint} from "@/lib/storyboards/types";
import {AnimaticTimelineSchema} from "./schema";
import type {AnimaticTimeline} from "./types";

export type AnimaticValidationResult={success:true;timeline:AnimaticTimeline}|{success:false;problems:string[]};

export function validateAnimaticTimeline(input:unknown,script:SceneScript,visualPlan:VisualPlan,storyboard:StoryboardBlueprint,expected:{
 animaticId:string;seriesId:string;sceneId:string;scriptId:string;visualPlanId:string;storyboardId:string;version:number;
}):AnimaticValidationResult{
 const parsed=AnimaticTimelineSchema.safeParse(input);
 if(!parsed.success)return{success:false,problems:parsed.error.issues.map(i=>`${i.path.join(".")}: ${i.message}`)};
 const timeline=parsed.data as AnimaticTimeline,problems:string[]=[];
 const match=(key:keyof typeof expected,value:string|number)=>{if(value!==expected[key])problems.push(`${String(key)} mismatch`);};
 match("animaticId",timeline.id);match("seriesId",timeline.seriesId);match("sceneId",timeline.sceneId);match("scriptId",timeline.scriptId);match("visualPlanId",timeline.visualPlanId);match("storyboardId",timeline.storyboardId);match("version",timeline.version);

 const panelById=new Map(storyboard.panels.map(p=>[p.id,p])),scriptById=new Map(script.blocks.map(b=>[b.id,b])),visualIds=new Set(visualPlan.visualBeats.map(b=>b.id));
 const meaningful=script.blocks.filter(b=>b.type==="ACTION"||b.type==="DIALOGUE"||b.type==="REACTION").map(b=>b.id),represented=new Set<string>(),clipIds=new Set<string>();
 let lastEnd=0;
 if(timeline.clips.some((c,i)=>c.sequenceIndex!==i))problems.push("clip sequenceIndex must be contiguous and monotonic");
 for(const clip of timeline.clips){
  if(clipIds.has(clip.id))problems.push(`duplicate clip id ${clip.id}`);clipIds.add(clip.id);
  const panel=panelById.get(clip.panelId);
  if(!panel)problems.push(`unknown panel ${clip.panelId}`);
  else if(panel.generationStatus!=="COMPLETED"||!panel.asset)problems.push(`panel ${clip.panelId} is not a completed usable asset`);
  if(!visualIds.has(clip.sourceVisualBeatId))problems.push(`unknown visual beat ${clip.sourceVisualBeatId}`);
  if(clip.startSeconds+0.001<lastEnd)problems.push(`clip ${clip.id} overlaps previous clip`);
  lastEnd=clip.startSeconds+clip.durationSeconds;
  for(const sourceId of clip.sourceScriptBlockIds){if(!scriptById.has(sourceId))problems.push(`unknown Script block ${sourceId}`);represented.add(sourceId);}
  for(const cue of clip.dialogueCues){
   const block=scriptById.get(cue.scriptBlockId);
   if(!block||block.type!=="DIALOGUE")problems.push(`invalid dialogue block ${cue.scriptBlockId}`);
   else{if(block.characterId!==cue.characterId)problems.push(`dialogue character mismatch ${cue.scriptBlockId}`);if(block.text!==cue.text)problems.push(`dialogue text rewritten ${cue.scriptBlockId}`);}
  }
  for(const cue of clip.actionCues){const block=scriptById.get(cue.scriptBlockId);if(!block||block.type!=="ACTION")problems.push(`invalid action block ${cue.scriptBlockId}`);else if(block.text!==cue.text)problems.push(`action text rewritten ${cue.scriptBlockId}`);}
 }
 for(const id of meaningful)if(!represented.has(id))problems.push(`meaningful Script block not represented: ${id}`);
 const finalDuration=timeline.clips.at(-1)!.startSeconds+timeline.clips.at(-1)!.durationSeconds;
 if(Math.abs(finalDuration-script.estimatedDurationSeconds)/script.estimatedDurationSeconds>0.15)problems.push("timeline duration outside ±15% of Script estimate");
 if(Math.abs(finalDuration-timeline.pacingChecks.timelineDurationSeconds)>0.02)problems.push("pacing timeline duration mismatch");
 return problems.length?{success:false,problems}:{success:true,timeline};
}
