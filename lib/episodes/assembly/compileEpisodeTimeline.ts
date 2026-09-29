import {randomUUID} from "node:crypto";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {SceneBlueprint} from "@/lib/scenes/types";
import type {SceneScript} from "@/lib/scripts/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {StoryboardBlueprint} from "@/lib/storyboards/types";
import type {AnimaticTimeline} from "@/lib/animatics/types";
import type {MotionPlan,MotionPlanStatus} from "@/lib/motion/types";
import type {EpisodeTimeline,EpisodeTransition} from "./types";

export class EpisodeAssemblyError extends Error{
  constructor(public readonly code:"EPISODE_MOTION_INCOMPLETE"|"EPISODE_PARENT_INVALID",message:string){super(message);this.name="EpisodeAssemblyError";}
}

export type EpisodeAssemblySceneInput={
  order:number;
  motionPlanStatus:MotionPlanStatus;
  series:SeriesBlueprint;
  scene:SceneBlueprint;
  script:SceneScript;
  visualPlan:VisualPlan;
  storyboard:StoryboardBlueprint;
  animatic:AnimaticTimeline;
  motionPlan:MotionPlan;
};

function transitionDuration(t:EpisodeTransition){return t==="DISSOLVE"?0.35:0;}

export function compileEpisodeTimeline(input:{
  assemblyId:string;
  seriesId:string;
  episodeKey:"episodeOne";
  version:number;
  scenes:EpisodeAssemblySceneInput[];
}):EpisodeTimeline{
  if(input.scenes.length===0)throw new EpisodeAssemblyError("EPISODE_PARENT_INVALID","At least one developed Scene is required.");
  const ordered=[...input.scenes].sort((a,b)=>a.order-b.order);
  const seenScenes=new Set<string>();
  let episodeCursor=0;
  const warnings:string[]=[];

  const scenes=ordered.map((bundle,index)=>{
    if(bundle.motionPlanStatus!=="READY")throw new EpisodeAssemblyError("EPISODE_MOTION_INCOMPLETE","MotionPlan must be READY before Episode Assembly.");
    if(bundle.order!==index)throw new EpisodeAssemblyError("EPISODE_PARENT_INVALID","Scene order must be explicit and contiguous.");
    if(seenScenes.has(bundle.motionPlan.sceneId))throw new EpisodeAssemblyError("EPISODE_PARENT_INVALID","Duplicate Scene IDs are not allowed.");
    seenScenes.add(bundle.motionPlan.sceneId);
    if(bundle.motionPlan.seriesId!==input.seriesId||bundle.motionPlan.sceneId!==bundle.animatic.sceneId||bundle.motionPlan.animaticId!==bundle.animatic.id)
      throw new EpisodeAssemblyError("EPISODE_PARENT_INVALID","MotionPlan parent chain does not match Episode inputs.");

    const unresolved=bundle.motionPlan.clips.filter(c=>c.generationStatus!=="COMPLETED"&&c.generationStatus!=="SKIPPED");
    if(unresolved.length)throw new EpisodeAssemblyError("EPISODE_MOTION_INCOMPLETE","Every Motion clip must be COMPLETED or SKIPPED.");

    const motionByAnimatic=new Map(bundle.motionPlan.clips.map(c=>[c.animaticClipId,c]));
    let sceneCursor=0;
    const clips=bundle.animatic.clips.map((animClip,clipIndex)=>{
      const motion=motionByAnimatic.get(animClip.id);
      if(!motion)throw new EpisodeAssemblyError("EPISODE_PARENT_INVALID","Every Animatic clip must have a Motion clip.");
      if(motion.sequenceIndex!==clipIndex||motion.targetDurationSeconds!==animClip.durationSeconds)
        throw new EpisodeAssemblyError("EPISODE_PARENT_INVALID","Motion timing/order diverges from Animatic.");

      const isVideo=motion.generationStatus==="COMPLETED";
      if(isVideo&&!motion.outputAsset)throw new EpisodeAssemblyError("EPISODE_MOTION_INCOMPLETE","Completed Motion clip has no output asset.");
      if(!isVideo&&motion.outputAsset)throw new EpisodeAssemblyError("EPISODE_PARENT_INVALID","SKIPPED Motion clip must not provide generated output.");

      const asset=isVideo?{
        url:motion.outputAsset!.url,storagePath:motion.outputAsset!.storagePath,mimeType:motion.outputAsset!.mimeType,
        width:motion.outputAsset!.width,height:motion.outputAsset!.height,sourceDurationSeconds:motion.outputAsset!.durationSeconds
      }:{
        url:motion.inputAsset.url,storagePath:motion.inputAsset.storagePath,mimeType:motion.inputAsset.mimeType,
        width:motion.inputAsset.width,height:motion.inputAsset.height,sourceDurationSeconds:null
      };

      if(isVideo&&motion.outputAsset!.durationSeconds>animClip.durationSeconds+.01)
        warnings.push("Generated source is "+motion.outputAsset!.durationSeconds.toFixed(1)+"s; using first "+animClip.durationSeconds.toFixed(1)+"s.");
      if(!isVideo)warnings.push("Clip "+(clipIndex+1)+" remains an intentional still hold.");

      const clipGlobalStart=episodeCursor+sceneCursor;
      const dialogueCues=animClip.dialogueCues.map(cue=>({
        scriptBlockId:cue.scriptBlockId,characterId:cue.characterId,text:cue.text,
        startSeconds:clipGlobalStart+cue.startOffsetSeconds,durationSeconds:cue.estimatedDurationSeconds
      }));

      const clip={
        id:randomUUID(),sourceAnimaticClipId:animClip.id,sourceMotionClipId:motion.id,sequenceIndex:clipIndex,
        sourceVisualBeatId:animClip.sourceVisualBeatId,sourceScriptBlockIds:[...animClip.sourceScriptBlockIds],
        mediaType:isVideo?"MOTION_VIDEO" as const:"STILL_HOLD" as const,asset,
        startSeconds:clipGlobalStart,durationSeconds:animClip.durationSeconds,sourceOffsetSeconds:0,
        transitionIn:animClip.transitionIn,transitionDurationSeconds:transitionDuration(animClip.transitionIn),
        dialogueCues,storyPurpose:animClip.storyPurpose
      };
      sceneCursor+=animClip.durationSeconds;
      return clip;
    });

    const sceneResult={
      sceneId:bundle.motionPlan.sceneId,order:index,startSeconds:episodeCursor,durationSeconds:sceneCursor,
      animaticId:bundle.animatic.id,motionPlanId:bundle.motionPlan.id,clips
    };
    episodeCursor+=sceneCursor;
    return sceneResult;
  });

  if(scenes.length===1)warnings.push("Episode currently contains one developed scene.");

  const first=input.scenes[0];
  const protectedCanon=[...new Set(input.scenes.flatMap(s=>s.motionPlan.continuityChecks.protectedCanon))];
  const protectedMysteries=[...new Set(input.scenes.flatMap(s=>s.motionPlan.continuityChecks.protectedMysteries))];
  const targetDurationSeconds=episodeCursor;
  const meaningfulIds=new Set(input.scenes.flatMap(s=>s.script.blocks.filter(b=>b.type==="ACTION"||b.type==="DIALOGUE"||b.type==="REACTION").map(b=>b.id)));
  const represented=new Set(scenes.flatMap(s=>s.clips.flatMap(c=>c.sourceScriptBlockIds)));
  const hasScriptCoverage=[...meaningfulIds].every(id=>represented.has(id));

  return{
    id:input.assemblyId,seriesId:input.seriesId,episodeKey:input.episodeKey,version:input.version,
    identity:{title:first.series.episodeOne.title},
    targetDurationSeconds,scenes,
    continuityChecks:{
      sourceSceneIds:scenes.map(s=>s.sceneId),sourceAnimaticIds:scenes.map(s=>s.animaticId),sourceMotionPlanIds:scenes.map(s=>s.motionPlanId),
      protectedCanon,protectedMysteries
    },
    validation:{hasVisualCoverage:true,hasScriptCoverage,durationDifferenceSeconds:0,warnings},
    confidence:{
      overall:Math.min(...input.scenes.map(s=>Math.min(s.motionPlan.confidence.overall,s.animatic.confidence.overall))),
      assumptions:["Episode Assembly preserves Animatic timing exactly and composes only durable Motion or Storyboard assets.","Dialogue cues are editorial metadata only; no audio is generated."]
    }
  };
}
