import {randomUUID} from "node:crypto";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {SceneBlueprint} from "@/lib/scenes/types";
import type {SceneScript,SceneScriptBlock} from "@/lib/scripts/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {StoryboardBlueprint,StoryboardStatus} from "@/lib/storyboards/types";
import type {AnimaticClip,AnimaticTimeline,MotionTreatment,AnimaticTransition} from "./types";
import {estimateDialogueSeconds,pauseSeconds,roundTime} from "./timing";

export class AnimaticCompileError extends Error{
  constructor(public readonly code:"ANIMATIC_STORYBOARD_INCOMPLETE"|"ANIMATIC_INVALID_STORYBOARD"|"ANIMATIC_SCRIPT_COVERAGE_FAILED",message:string){super(message);this.name="AnimaticCompileError";}
}

function meaningful(block:SceneScriptBlock){return block.type==="ACTION"||block.type==="DIALOGUE"||block.type==="REACTION";}

function transition(index:number,purpose:string):AnimaticTransition{
  if(index===0)return "CUT";
  if(/hold|pause|hesitat|reaction/i.test(purpose))return "HOLD";
  return /reveal|memory|dream|shift/i.test(purpose)?"DISSOLVE":"CUT";
}

function motion(index:number,clipPurpose:string):{t:MotionTreatment;s:number}{
  if(/reaction|hesitat|realiz|emotion/i.test(clipPurpose))return{t:"SLOW_PUSH",s:0.28};
  if(/establish|environment|location/i.test(clipPurpose))return{t:"SLOW_PULL",s:0.18};
  if(/move|cross|travel|follow/i.test(clipPurpose))return{t:index%2===0?"PAN_RIGHT":"PAN_LEFT",s:0.22};
  return{t:"STATIC",s:0};
}

export function compileAnimaticTimeline(input:{
  animaticId:string;version:number;series:SeriesBlueprint;scene:SceneBlueprint;script:SceneScript;visualPlan:VisualPlan;
  storyboard:StoryboardBlueprint;storyboardStatus:StoryboardStatus;
}):AnimaticTimeline{
  if(input.storyboardStatus!=="READY"&&input.storyboardStatus!=="PARTIAL")throw new AnimaticCompileError("ANIMATIC_INVALID_STORYBOARD","Storyboard is not ready for animatic assembly.");

  const completed=input.storyboard.panels.filter(panel=>panel.generationStatus==="COMPLETED"&&panel.asset);
  const meaningfulIds=input.script.blocks.filter(meaningful).map(block=>block.id);
  const covered=new Set(completed.flatMap(panel=>panel.sourceScriptBlockIds));
  const missing=meaningfulIds.filter(id=>!covered.has(id));
  if(missing.length)throw new AnimaticCompileError("ANIMATIC_STORYBOARD_INCOMPLETE","Completed storyboard panels do not cover every meaningful Script block.");
  if(completed.length===0)throw new AnimaticCompileError("ANIMATIC_STORYBOARD_INCOMPLETE","No completed storyboard panels are available.");

  const scriptById=new Map(input.script.blocks.map(block=>[block.id,block]));
  const visualById=new Map(input.visualPlan.visualBeats.map(beat=>[beat.id,beat]));
  const target=input.script.estimatedDurationSeconds;

  const rawDurations=completed.map(panel=>{
    const blocks=panel.sourceScriptBlockIds.map(id=>scriptById.get(id)).filter((x):x is SceneScriptBlock=>Boolean(x));
    const speech=blocks.reduce((sum,block)=>sum+(block.type==="DIALOGUE"?estimateDialogueSeconds(block.text):0),0);
    const pauses=blocks.reduce((sum,block)=>sum+(block.type==="PAUSE"?pauseSeconds(block):0),0);
    const reactions=blocks.filter(block=>block.type==="REACTION").length*0.65;
    const actionPadding=blocks.some(block=>block.type==="ACTION")?0.55:0;
    const visual=visualById.get(panel.sourceVisualBeatId)?.estimatedDurationSeconds??0;
    return Math.max(1.2,visual,speech+pauses+reactions+actionPadding);
  });

  const totalRaw=rawDurations.reduce((a,b)=>a+b,0);
  const scale=totalRaw>0?target/totalRaw:1;
  const boundedScale=Math.min(1.5,Math.max(0.65,scale));
  const durations=rawDurations.map(x=>roundTime(x*boundedScale));
  const adjustedTotal=durations.reduce((a,b)=>a+b,0);
  if(durations.length&&Math.abs(adjustedTotal-target)/Math.max(1,target)>0.15){
    const delta=target-adjustedTotal;
    durations[durations.length-1]=roundTime(Math.max(0.8,durations[durations.length-1]+delta));
  }

  let cursor=0;
  const clips:AnimaticClip[]=completed.sort((a,b)=>a.sequenceIndex-b.sequenceIndex).map((panel,index)=>{
    const blocks=panel.sourceScriptBlockIds.map(id=>scriptById.get(id)).filter((x):x is SceneScriptBlock=>Boolean(x));
    let cueCursor=0;
    const dialogueCues=blocks.flatMap(block=>{
      if(block.type!=="DIALOGUE")return[];
      const duration=roundTime(estimateDialogueSeconds(block.text));
      const cue={scriptBlockId:block.id,characterId:block.characterId,text:block.text,startOffsetSeconds:roundTime(cueCursor),estimatedDurationSeconds:duration};
      cueCursor+=duration;
      return[cue];
    });
    const actionCues=blocks.flatMap(block=>block.type==="ACTION"?[{scriptBlockId:block.id,text:block.text}]:[]);
    const m=motion(index,panel.purpose+" "+panel.emotionalFocus);
    const clip:AnimaticClip={
      id:randomUUID(),panelId:panel.id,sequenceIndex:index,sourceVisualBeatId:panel.sourceVisualBeatId,sourceScriptBlockIds:[...panel.sourceScriptBlockIds],
      asset:panel.asset!,startSeconds:roundTime(cursor),durationSeconds:durations[index],transitionIn:transition(index,panel.purpose),
      motionTreatment:m.t,motionStrength:m.s,storyPurpose:panel.purpose,emotionalFunction:panel.emotionalFocus,dialogueCues,actionCues
    };
    cursor+=durations[index];
    return clip;
  });

  const timelineDuration=roundTime(clips.reduce((sum,clip)=>sum+clip.durationSeconds,0));
  const diff=roundTime(timelineDuration-target);
  const warnings:string[]=[];
  const ratio=Math.abs(diff)/Math.max(1,target);
  if(ratio>0.08)warnings.push(`Scene runs ${Math.round(ratio*100)}% ${diff>0?"longer":"shorter"} than its script estimate.`);
  for(const clip of clips){
    if(clip.durationSeconds<0.8)warnings.push(`Clip ${clip.sequenceIndex+1} has less than 0.8 seconds.`);
    const spoken=clip.dialogueCues.reduce((sum,c)=>sum+c.estimatedDurationSeconds,0);
    if(spoken>clip.durationSeconds)warnings.push(`Dialogue may feel rushed in clip ${clip.sequenceIndex+1}.`);
  }
  if(input.storyboardStatus==="PARTIAL")warnings.push("Storyboard is partial, but completed panels preserve all meaningful Script content.");

  return{
    id:input.animaticId,seriesId:input.storyboard.seriesId,sceneId:input.storyboard.sceneId,scriptId:input.storyboard.scriptId,
    visualPlanId:input.storyboard.visualPlanId,storyboardId:input.storyboard.id,version:input.version,
    identity:{title:input.storyboard.identity.title.replace(/Storyboard/i,"Animatic")},targetDurationSeconds:target,clips,
    pacingChecks:{scriptDurationSeconds:target,timelineDurationSeconds:timelineDuration,differenceSeconds:diff,warnings},
    confidence:{overall:Math.min(input.storyboard.confidence.overall,input.visualPlan.confidence.overall,input.script.confidence.overall),assumptions:[
      "Animatic timing uses deterministic Script, VisualPlan, dialogue-length, and pause heuristics.",
      ...(input.storyboardStatus==="PARTIAL"?["The partial Storyboard retained complete meaningful Script coverage."]:[])
    ]}
  };
}
