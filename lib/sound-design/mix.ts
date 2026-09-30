import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import type {DialogueAudioPlan} from "@/lib/dialogue-audio/types";
import type {EpisodeMixTimeline,SoundDesignPlan,SoundCueState} from "./types";

export function buildEpisodeMixTimeline(input:{episode:EpisodeTimeline;dialogue:DialogueAudioPlan|null;plan:SoundDesignPlan;states:SoundCueState[]}):EpisodeMixTimeline{
 const byId=new Map(input.states.map(s=>[s.cueId,s]));
 const dialogue=input.dialogue?.lines.filter(l=>l.audioAsset).map(l=>({cueId:l.id,type:"DIALOGUE" as const,startSeconds:l.episodeStartSeconds,durationSeconds:l.visualWindowSeconds,gainDb:0,duckedGainDb:null,loop:false,assetUrl:l.audioAsset?.url??null}))??[];
 const music=[],ambience=[],effects=[];
 for(const cue of input.plan.cues){
   if(cue.type==="SILENCE")continue;const state=byId.get(cue.id),clip={cueId:cue.id,type:cue.type==="MUSIC"?"MUSIC" as const:cue.type==="AMBIENCE"?"AMBIENCE" as const:"EFFECT" as const,startSeconds:cue.startSeconds,durationSeconds:cue.durationSeconds,gainDb:cue.gainDb,duckedGainDb:cue.duckUnderDialogue?(cue.type==="MUSIC"?-22:-30):null,loop:cue.type==="AMBIENCE"&&cue.loopable,assetUrl:state?.asset?.url??null};
   if(cue.type==="MUSIC")music.push(clip);else if(cue.type==="AMBIENCE")ambience.push(clip);else effects.push(clip);
 }
 return{durationSeconds:input.episode.targetDurationSeconds,tracks:{dialogue:{id:"dialogue",clips:dialogue,muted:false},music:{id:"music",clips:music,muted:false},ambience:{id:"ambience",clips:ambience,muted:false},effects:{id:"effects",clips:effects,muted:false}},masterPreviewGainDb:0};
}
