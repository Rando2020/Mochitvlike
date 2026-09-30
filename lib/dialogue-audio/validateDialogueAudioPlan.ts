import type {SeriesBlueprint} from "@/lib/series/types";
import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import type {DialogueAudioPlan,VoiceCast} from "./types";
import {DialogueAudioPlanSchema,VoiceCastSchema} from "./schema";
import {checksumText} from "./checksums";

export type DialogueValidationResult={success:true}|{success:false;problems:string[]};

export function validateDialogueAudioPlan(input:{
  series:SeriesBlueprint;timeline:EpisodeTimeline;voiceCast:VoiceCast;plan:DialogueAudioPlan;
}):DialogueValidationResult{
  const problems:string[]=[];
  const castParsed=VoiceCastSchema.safeParse(input.voiceCast),planParsed=DialogueAudioPlanSchema.safeParse(input.plan);
  if(!castParsed.success)problems.push(...castParsed.error.issues.map(i=>"voiceCast."+i.path.join(".")+": "+i.message));
  if(!planParsed.success)problems.push(...planParsed.error.issues.map(i=>"plan."+i.path.join(".")+": "+i.message));
  if(problems.length)return{success:false,problems};

  if(input.voiceCast.seriesId!==input.plan.seriesId||input.voiceCast.episodeAssemblyId!==input.plan.episodeAssemblyId||input.plan.voiceCastId!==input.voiceCast.id)
    problems.push("VoiceCast and DialogueAudioPlan parent identity mismatch.");

  const seriesCast=new Map(input.series.cast.map(c=>[c.id,c]));
  const speakingIds=new Set(input.timeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues.map(d=>d.characterId))));
  const assignmentIds=new Set<string>(),assignedCharacters=new Set<string>();
  for(const a of input.voiceCast.assignments){
    if(assignmentIds.has(a.id))problems.push("duplicate voice assignment id "+a.id);assignmentIds.add(a.id);
    if(assignedCharacters.has(a.characterId))problems.push("duplicate character voice assignment "+a.characterId);assignedCharacters.add(a.characterId);
    if(!seriesCast.has(a.characterId))problems.push("voice assignment references unknown character "+a.characterId);
    if(!speakingIds.has(a.characterId))problems.push("non-speaking character should not be auto-cast "+a.characterId);
  }
  for(const id of speakingIds)if(!assignedCharacters.has(id))problems.push("speaking character missing voice assignment "+id);

  const cues=input.timeline.scenes.flatMap(s=>s.clips.flatMap(c=>c.dialogueCues.map(d=>({clip:c,cue:d}))))
    .sort((a,b)=>a.cue.startSeconds-b.cue.startSeconds||a.cue.scriptBlockId.localeCompare(b.cue.scriptBlockId));
  if(input.plan.lines.length!==cues.length)problems.push("Dialogue line count does not match EpisodeTimeline cues.");
  input.plan.lines.forEach((line,index)=>{
    const src=cues[index];if(!src){problems.push("extra dialogue line");return;}
    if(line.scriptBlockId!==src.cue.scriptBlockId)problems.push("scriptBlockId order mismatch");
    if(line.characterId!==src.cue.characterId)problems.push("dialogue character mismatch");
    if(line.text!==src.cue.text)problems.push("dialogue text rewritten");
    if(line.textChecksum!==checksumText(src.cue.text))problems.push("dialogue text checksum mismatch");
    if(Math.abs(line.episodeStartSeconds-src.cue.startSeconds)>.001)problems.push("Episode start timestamp changed");
    const maxWindow=Math.max(.05,Math.min(src.cue.durationSeconds,src.clip.startSeconds+src.clip.durationSeconds-src.cue.startSeconds));
    if(Math.abs(line.visualWindowSeconds-maxWindow)>.001)problems.push("visual window changed");
    const assignment=input.voiceCast.assignments.find(a=>a.id===line.voiceAssignmentId);
    if(!assignment||assignment.characterId!==line.characterId)problems.push("invalid voice assignment reference");
  });
  if(!input.plan.validation.allDialogueCovered)problems.push("allDialogueCovered must be true");
  return problems.length?{success:false,problems}:{success:true};
}
