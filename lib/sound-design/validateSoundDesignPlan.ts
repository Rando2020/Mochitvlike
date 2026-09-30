import type {SeriesBlueprint} from "@/lib/series/types";
import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import type {DialogueAudioPlan} from "@/lib/dialogue-audio/types";
import type {SoundDesignPlan,SoundSceneContext} from "./types";
import {SoundDesignPlanSchema} from "./schema";

export function validateSoundDesignPlan(input:{plan:SoundDesignPlan;series:SeriesBlueprint;episode:EpisodeTimeline;dialogue:DialogueAudioPlan|null;scenes:SoundSceneContext[]}){
 const parsed=SoundDesignPlanSchema.safeParse(input.plan);const problems:string[]=[];
 if(!parsed.success)return{success:false as const,problems:parsed.error.issues.map(i=>i.path.join(".")+": "+i.message)};
 if(input.plan.seriesId!==input.episode.seriesId||input.plan.episodeAssemblyId!==input.episode.id)problems.push("Episode parent mismatch");
 if(input.plan.dialoguePlanId!==(input.dialogue?.id??null))problems.push("Dialogue parent mismatch");
 const ids=new Set<string>(),sceneIds=new Set(input.scenes.map(s=>s.scene.id)),scriptIds=new Set(input.scenes.flatMap(s=>s.script.blocks.map(b=>b.id))),visualIds=new Set(input.scenes.flatMap(s=>s.visualPlan.visualBeats.map(v=>v.id))),dialogueIds=new Set(input.dialogue?.lines.map(l=>l.id)??[]);
 for(const cue of input.plan.cues){
   if(ids.has(cue.id))problems.push("duplicate cue id "+cue.id);ids.add(cue.id);
   if(cue.endSeconds>input.episode.targetDurationSeconds+.001||cue.endSeconds<=cue.startSeconds)problems.push("cue outside Episode timing");
   if(cue.type!=="SILENCE"&&Math.abs(cue.endSeconds-(cue.startSeconds+cue.durationSeconds))>.001)problems.push("cue duration/end mismatch");
   if((cue.type==="SFX"||cue.type==="FOLEY")&&(cue.syncPointSeconds<cue.startSeconds||cue.syncPointSeconds>cue.endSeconds))problems.push("effect sync point outside cue");
   for(const ref of cue.sourceReferences){
     if(ref.type==="SCENE"&&!sceneIds.has(ref.id))problems.push("invalid Scene source ref "+ref.id);
     if(ref.type==="SCRIPT_BLOCK"&&!scriptIds.has(ref.id))problems.push("invalid Script source ref "+ref.id);
     if(ref.type==="VISUAL_BEAT"&&!visualIds.has(ref.id))problems.push("invalid VisualBeat source ref "+ref.id);
     if(ref.type==="DIALOGUE_LINE"&&!dialogueIds.has(ref.id))problems.push("invalid Dialogue source ref "+ref.id);
   }
 }
 if(!input.plan.validation.visualTimingPreserved)problems.push("visual timing must remain preserved");
 if(!input.plan.validation.dialogueTimingPreserved)problems.push("dialogue timing must remain preserved");
 return problems.length?{success:false as const,problems}:{success:true as const,plan:input.plan};
}
