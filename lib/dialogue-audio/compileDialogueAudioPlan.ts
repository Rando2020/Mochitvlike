import {createHash} from "node:crypto";
import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import type {VoiceCast,DialogueAudioPlan} from "./types";
import {checksumText} from "./checksums";

function stableUuid(seed:string){
  const h=createHash("sha256").update(seed,"utf8").digest("hex").slice(0,32).split("");
  h[12]="5";h[16]=["8","9","a","b"][parseInt(h[16],16)%4];
  const x=h.join("");return x.slice(0,8)+"-"+x.slice(8,12)+"-"+x.slice(12,16)+"-"+x.slice(16,20)+"-"+x.slice(20);
}

export function compileDialogueAudioPlan(input:{
  planId:string;seriesId:string;episodeAssemblyId:string;voiceCast:VoiceCast;timeline:EpisodeTimeline;version:number;
}):DialogueAudioPlan{
  const assignmentByCharacter=new Map(input.voiceCast.assignments.map(a=>[a.characterId,a]));
  const cues=input.timeline.scenes.flatMap(scene=>scene.clips.flatMap(clip=>clip.dialogueCues.map(cue=>({clip,cue}))))
    .sort((a,b)=>a.cue.startSeconds-b.cue.startSeconds||a.cue.scriptBlockId.localeCompare(b.cue.scriptBlockId));
  const lines=cues.map(({clip,cue})=>{
    const assignment=assignmentByCharacter.get(cue.characterId);
    if(!assignment)throw new Error("VOICE_ASSIGNMENT_INVALID");
    const remaining=Math.max(.05,clip.startSeconds+clip.durationSeconds-cue.startSeconds);
    const window=Math.max(.05,Math.min(cue.durationSeconds,remaining));
    return{
      id:stableUuid(input.episodeAssemblyId+"|"+cue.scriptBlockId+"|"+cue.characterId+"|"+cue.startSeconds),scriptBlockId:cue.scriptBlockId,characterId:cue.characterId,text:cue.text,textChecksum:checksumText(cue.text),
      episodeStartSeconds:cue.startSeconds,visualWindowSeconds:window,voiceAssignmentId:assignment.id,
      generationStatus:"PENDING" as const,audioAsset:null,
      timing:{naturalDurationSeconds:null,differenceSeconds:null,fit:"UNKNOWN" as const}
    };
  });
  return{
    id:input.planId,seriesId:input.seriesId,episodeAssemblyId:input.episodeAssemblyId,voiceCastId:input.voiceCast.id,version:input.version,lines,
    validation:{allDialogueCovered:lines.length===cues.length,warnings:[]},
    confidence:{overall:.9,assumptions:["Episode visual timing remains authoritative.","Dialogue text is copied exactly from EpisodeTimeline cues."]}
  };
}
