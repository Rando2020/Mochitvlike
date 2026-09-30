import type {SeriesBlueprint} from "@/lib/series/types";
import type {EpisodeTimeline} from "@/lib/episodes/assembly/types";
import type {DialogueAudioPlan} from "@/lib/dialogue-audio/types";
import type {SoundCue,SoundDesignPlan,SoundSceneContext,MusicPurpose} from "./types";
import {stableSoundUuid} from "./id";

const SOUND_EVENTS=[
 {re:/\b(door|gate)\b.*\b(slam|shut|close|closes|closed)\b|\b(slam|shut|close|closes|closed)\b.*\b(door|gate)\b/i,type:"SFX" as const,label:"door closes",intensity:.55},
 {re:/\b(open|opens|opened)\b.*\b(door|gate)\b|\b(door|gate)\b.*\b(open|opens|opened)\b/i,type:"SFX" as const,label:"door opens",intensity:.4},
 {re:/\b(glass)\b.*\b(shatter|shatters|break|breaks|broke)\b/i,type:"SFX" as const,label:"glass shatters",intensity:.8},
 {re:/\b(sword|blade)\b.*\b(clash|strike|strikes|hit|hits)\b|\b(clash|strike|strikes)\b.*\b(sword|blade)\b/i,type:"SFX" as const,label:"sword impact",intensity:.8},
 {re:/\b(explosion|explodes|explode|blast)\b/i,type:"SFX" as const,label:"explosion",intensity:1},
 {re:/\b(thunder|thunderclap)\b/i,type:"SFX" as const,label:"thunder",intensity:.75},
 {re:/\b(punch|punches|kick|kicks)\b/i,type:"SFX" as const,label:"body impact",intensity:.7},
 {re:/\b(walk|walks|walking|run|runs|running|footstep|footsteps|steps)\b/i,type:"FOLEY" as const,label:"footsteps",intensity:.35},
 {re:/\b(cloth|coat|robe|fabric|shirt)\b.*\b(rustle|rustles|shift|moves|turns)\b/i,type:"FOLEY" as const,label:"cloth movement",intensity:.2}
];
const ENVIRONMENTS=[
 {re:/\brain\b/i,label:"rain",chars:["steady environmental texture"]},
 {re:/\bwind\b/i,label:"wind",chars:["natural air movement"]},
 {re:/\bforest|woods|trees\b/i,label:"forest",chars:["subtle leaves","distant natural ambience"]},
 {re:/\bcity|street|alley\b/i,label:"city street",chars:["distant urban bed"]},
 {re:/\bcave|cavern\b/i,label:"cave",chars:["distant drips","soft reverberant air"]},
 {re:/\bocean|sea|shore|beach\b/i,label:"shore",chars:["waves","open-air ambience"]},
 {re:/\bmarket|bazaar\b/i,label:"market",chars:["distant crowd texture"]},
 {re:/\bhallway|corridor\b/i,label:"hallway",chars:["quiet interior room tone"]},
 {re:/\broom|office|home|house|bedroom|kitchen\b/i,label:"interior room",chars:["subtle room tone"]}
];

function beatPurpose(series:SeriesBlueprint,scene:SoundSceneContext):MusicPurpose{
 const beat=series.episodeOne.beats.find(b=>b.id===scene.scene.sourceBeatId)?.type;
 if(beat==="HOOK"||beat==="SETUP")return"OPENING";
 if(beat==="ACTION")return"ACTION";
 if(beat==="EMOTIONAL")return"EMOTIONAL";
 if(beat==="REVEAL")return"REVEAL";
 if(beat==="CLIFFHANGER")return"CLOSING";
 if(beat==="CONFLICT"||beat==="ESCALATION")return"TENSION";
 if(beat==="DISCOVERY")return"MYSTERY";
 return"TRANSITION";
}
function musicEnergy(series:SeriesBlueprint,purpose:MusicPurpose){
 const emotional=series.creativeDNA.tone.emotionalIntensity,dark=series.creativeDNA.tone.darkness;
 const base=purpose==="ACTION"?.9:purpose==="TENSION"?.72:purpose==="REVEAL"?.65:purpose==="EMOTIONAL"?.45:.38;
 return Math.max(0,Math.min(1,base*.65+emotional*.25+dark*.1));
}
function motifIds(series:SeriesBlueprint){return series.creativeDNA.sound.recurringMotifs.map((m,i)=>stableSoundUuid("motif|"+i+"|"+m));}
function clipForBlock(episode:EpisodeTimeline,blockId:string){return episode.scenes.flatMap(s=>s.clips).find(c=>c.sourceScriptBlockIds.includes(blockId));}
function hasDialogue(dialogue:DialogueAudioPlan|null,start:number,end:number){return !!dialogue?.lines.some(l=>l.episodeStartSeconds<end&&l.episodeStartSeconds+l.visualWindowSeconds>start);}
function coverage(cues:SoundCue[]){const ranges=cues.filter(c=>c.type!=="SILENCE").map(c=>[c.startSeconds,c.endSeconds] as [number,number]).sort((a,b)=>a[0]-b[0]);let total=0,start=-1,end=-1;for(const [a,b] of ranges){if(a>end){if(end>=0)total+=end-start;start=a;end=b}else end=Math.max(end,b);}if(end>=0)total+=end-start;return total;}

export function compileSoundDesignPlan(input:{planId:string;series:SeriesBlueprint;episode:EpisodeTimeline;dialogue:DialogueAudioPlan|null;scenes:SoundSceneContext[];version:number}):SoundDesignPlan{
 const cues:SoundCue[]=[];const warnings:string[]=[];const motifs=motifIds(input.series);
 for(const ctx of [...input.scenes].sort((a,b)=>a.order-b.order)){
   const episodeScene=input.episode.scenes.find(s=>s.sceneId===ctx.scene.id);if(!episodeScene)continue;
   const purpose=beatPurpose(input.series,ctx),start=episodeScene.startSeconds,duration=episodeScene.durationSeconds,end=start+duration;
   if(duration>=3){
     cues.push({id:stableSoundUuid("music|"+input.planId+"|"+ctx.scene.id),type:"MUSIC",startSeconds:start,durationSeconds:duration,endSeconds:end,priority:"BACKGROUND",gainDb:-12,fadeInSeconds:Math.min(.8,duration/4),fadeOutSeconds:Math.min(.8,duration/4),duckUnderDialogue:hasDialogue(input.dialogue,start,end),sourceReferences:[{type:"SERIES_SOUND",id:"creativeDNA.sound"},{type:"SCENE",id:ctx.scene.id}],storyPurpose:"Support the scene's established emotional function without changing story events.",generationStatus:"PENDING",mood:input.series.creativeDNA.tone.primary,energy:musicEnergy(input.series,purpose),purpose,musicDirection:input.series.creativeDNA.sound.musicDirection,recurringMotifIds:motifs});
   }

   const environmentText=[ctx.scene.location.settingNotes,input.series.creativeDNA.sound.soundDesign,...ctx.visualPlan.continuity.environmentRules].join(" ");
   const env=ENVIRONMENTS.find(e=>e.re.test(environmentText));
   if(env){
     cues.push({id:stableSoundUuid("ambience|"+input.planId+"|"+ctx.scene.id+"|"+env.label),type:"AMBIENCE",startSeconds:start,durationSeconds:duration,endSeconds:end,priority:"BACKGROUND",gainDb:-24,fadeInSeconds:.35,fadeOutSeconds:.35,duckUnderDialogue:hasDialogue(input.dialogue,start,end),sourceReferences:[{type:"SCENE",id:ctx.scene.id},...(ctx.scene.location.locationId?[{type:"LOCATION" as const,id:ctx.scene.location.locationId}]:[])],storyPurpose:"Ground the already-established environment.",generationStatus:"PENDING",environment:env.label,characteristics:env.chars,loopable:duration>8});
   }

   for(const block of ctx.script.blocks){
     const clip=clipForBlock(input.episode,block.id);if(!clip)continue;
     if(block.type==="PAUSE"){
       const d=block.durationHint==="SHORT"?.5:block.durationHint==="MEDIUM"?1:Math.min(1.5,clip.durationSeconds);
       const sd=Math.min(d,clip.durationSeconds),ss=Math.min(clip.startSeconds+clip.durationSeconds-sd,clip.startSeconds+clip.durationSeconds*.35);
       cues.push({id:stableSoundUuid("silence|"+input.planId+"|"+block.id),type:"SILENCE",startSeconds:ss,durationSeconds:sd,endSeconds:ss+sd,sourceReferences:[{type:"SCRIPT_BLOCK",id:block.id}],storyPurpose:block.purpose,reason:"Authoritative Script pause creates an intentional sound-rest region."});
       continue;
     }
     if(block.type!=="ACTION")continue;
     const match=SOUND_EVENTS.find(x=>x.re.test(block.text));if(!match)continue;
     const sync=Math.min(clip.startSeconds+clip.durationSeconds-.05,clip.startSeconds+clip.durationSeconds*.45);
     const desired=match.type==="FOLEY"?Math.min(1.5,Math.max(.5,clip.durationSeconds*.4)):Math.min(2,Math.max(.5,clip.durationSeconds*.35));
     const d=Math.max(.05,Math.min(clip.durationSeconds,desired));
     const base={id:stableSoundUuid(match.type+"|"+input.planId+"|"+block.id+"|"+match.label),startSeconds:Math.max(clip.startSeconds,sync-d*.25),durationSeconds:d,endSeconds:Math.max(clip.startSeconds,sync-d*.25)+d,priority:"FOREGROUND" as const,gainDb:-8,fadeInSeconds:.03,fadeOutSeconds:.08,duckUnderDialogue:false,sourceReferences:[{type:"SCRIPT_BLOCK" as const,id:block.id}],storyPurpose:"Reinforce an explicit scripted physical action.",generationStatus:"PENDING" as const};
     if(match.type==="SFX")cues.push({...base,type:"SFX",event:match.label,intensity:match.intensity,syncPointSeconds:sync});
     else cues.push({...base,type:"FOLEY",action:match.label,material:null,syncPointSeconds:sync});
   }
 }

 const deduped:SoundCue[]=[];for(const cue of cues){const duplicate=deduped.some(x=>x.type===cue.type&&x.type!=="SILENCE"&&cue.type!=="SILENCE"&&Math.abs(x.startSeconds-cue.startSeconds)<.25&&("event" in x&&"event" in cue?x.event===cue.event:"action" in x&&"action" in cue?x.action===cue.action:false));if(!duplicate)deduped.push(cue);}
 const silences=deduped.filter(c=>c.type==="SILENCE");
 for(const s of silences)for(const c of deduped){if(c.type!=="SILENCE"&&c.startSeconds<s.endSeconds&&c.endSeconds>s.startSeconds&&c.type!=="AMBIENCE")warnings.push(c.type+" cue overlaps intentional silence at "+s.startSeconds.toFixed(1)+"s.");}
 for(const c of deduped){if((c.type==="SFX"||c.type==="FOLEY")&&input.dialogue?.lines.some(l=>l.episodeStartSeconds<c.endSeconds&&l.episodeStartSeconds+l.visualWindowSeconds>c.startSeconds)&&c.priority==="FOREGROUND")warnings.push(c.type+" cue overlaps dialogue at high priority near "+c.startSeconds.toFixed(1)+"s.");}
 return{id:input.planId,seriesId:input.episode.seriesId,episodeAssemblyId:input.episode.id,dialoguePlanId:input.dialogue?.id??null,version:input.version,cues:deduped,validation:{visualTimingPreserved:true,dialogueTimingPreserved:true,cueCoverageSeconds:coverage(deduped),warnings:[...new Set(warnings)]},confidence:{overall:.86,assumptions:["Sound cues are derived only from existing Series sound direction, explicit Scene environment, Script blocks, and Episode timing.","Intentional silence is only introduced where the Script explicitly contains a PAUSE.","Provider audio never changes Episode or dialogue timing."]}};
}
