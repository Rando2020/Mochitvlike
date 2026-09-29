import type {SceneScriptBlock} from "@/lib/scripts/types";

export const DEFAULT_ANIMATIC_DIALOGUE_WPM=150;

export function estimateDialogueSeconds(text:string,wpm=Number(process.env.ANIMATIC_DIALOGUE_WPM)||DEFAULT_ANIMATIC_DIALOGUE_WPM){
  const words=text.trim().split(/\s+/).filter(Boolean).length;
  return words===0?0:Math.max(0.8,(words/wpm)*60);
}

export function pauseSeconds(block:Extract<SceneScriptBlock,{type:"PAUSE"}>){
  return block.durationHint==="SHORT"?0.5:block.durationHint==="MEDIUM"?1:1.8;
}

export function roundTime(value:number){return Math.round(value*1000)/1000;}
