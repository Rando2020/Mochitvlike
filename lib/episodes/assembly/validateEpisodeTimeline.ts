import type {SceneScript} from "@/lib/scripts/types";
import type {AnimaticTimeline} from "@/lib/animatics/types";
import type {MotionPlan} from "@/lib/motion/types";
import {EpisodeTimelineSchema} from "./schema";
import type {EpisodeTimeline} from "./types";

export type EpisodeValidationSceneContext={sceneId:string;script:SceneScript;animatic:AnimaticTimeline;motionPlan:MotionPlan};
export type EpisodeValidationResult={success:true;timeline:EpisodeTimeline}|{success:false;problems:string[]};

export function validateEpisodeTimeline(input:unknown,contexts:EpisodeValidationSceneContext[],expected:{
  assemblyId:string;seriesId:string;episodeKey:"episodeOne";version:number;
}):EpisodeValidationResult{
  const parsed=EpisodeTimelineSchema.safeParse(input);
  if(!parsed.success)return{success:false,problems:parsed.error.issues.map(i=>i.path.join(".")+": "+i.message)};
  const timeline=parsed.data as EpisodeTimeline,problems:string[]=[];
  if(timeline.id!==expected.assemblyId)problems.push("assembly id mismatch");
  if(timeline.seriesId!==expected.seriesId)problems.push("series id mismatch");
  if(timeline.episodeKey!==expected.episodeKey)problems.push("episode key mismatch");
  if(timeline.version!==expected.version)problems.push("version mismatch");

  const contextByScene=new Map(contexts.map(c=>[c.sceneId,c]));
  const sceneIds=new Set<string>(),clipIds=new Set<string>();
  let expectedSceneStart=0;
  const representedScript=new Set<string>(),meaningfulScript=new Set<string>();
  const expectedCanon=[...new Set(contexts.flatMap(c=>c.motionPlan.continuityChecks.protectedCanon))];
  const expectedMysteries=[...new Set(contexts.flatMap(c=>c.motionPlan.continuityChecks.protectedMysteries))];

  for(const [sceneIndex,scene] of timeline.scenes.entries()){
    if(scene.order!==sceneIndex)problems.push("scene order must be contiguous");
    if(sceneIds.has(scene.sceneId))problems.push("duplicate Scene ID "+scene.sceneId);sceneIds.add(scene.sceneId);
    if(Math.abs(scene.startSeconds-expectedSceneStart)>.01)problems.push("scene start time mismatch");
    const context=contextByScene.get(scene.sceneId);
    if(!context){problems.push("unknown Scene "+scene.sceneId);continue;}
    if(context.motionPlan.animaticId!==scene.animaticId||context.motionPlan.id!==scene.motionPlanId)problems.push("scene source references mismatch");
    if(context.motionPlan.clips.some(c=>c.generationStatus!=="COMPLETED"&&c.generationStatus!=="SKIPPED"))problems.push("MotionPlan is not fully resolved");
    if(context.animatic.clips.length!==scene.clips.length)problems.push("every Animatic clip must be represented");

    let expectedClipStart=scene.startSeconds;
    for(const [clipIndex,clip] of scene.clips.entries()){
      if(clipIds.has(clip.id))problems.push("duplicate Episode clip ID "+clip.id);clipIds.add(clip.id);
      if(clip.sequenceIndex!==clipIndex)problems.push("clip order must be contiguous");
      if(Math.abs(clip.startSeconds-expectedClipStart)>.01)problems.push("clip start time mismatch");
      const anim=context.animatic.clips[clipIndex],motion=context.motionPlan.clips[clipIndex];
      if(!anim||!motion){problems.push("missing source clip");continue;}
      if(clip.sourceAnimaticClipId!==anim.id||clip.sourceMotionClipId!==motion.id)problems.push("clip source identity mismatch");
      if(clip.sourceVisualBeatId!==anim.sourceVisualBeatId)problems.push("VisualBeat traceability changed");
      if(JSON.stringify(clip.sourceScriptBlockIds)!==JSON.stringify(anim.sourceScriptBlockIds))problems.push("Script traceability changed");
      if(Math.abs(clip.durationSeconds-anim.durationSeconds)>.01)problems.push("Animatic duration changed");
      if(clip.sourceOffsetSeconds!==0)problems.push("v1 sourceOffsetSeconds must be zero");
      if(clip.transitionIn!==anim.transitionIn)problems.push("transition intent changed");
      if(clip.transitionIn==="DISSOLVE"&&(clip.transitionDurationSeconds<.25||clip.transitionDurationSeconds>.5))problems.push("DISSOLVE duration outside bounded range");
      if(clip.transitionIn!=="DISSOLVE"&&clip.transitionDurationSeconds!==0)problems.push("CUT/HOLD transition duration must be zero");

      if(motion.generationStatus==="COMPLETED"){
        if(!motion.outputAsset)problems.push("completed Motion clip lacks output asset");
        if(clip.mediaType!=="MOTION_VIDEO")problems.push("completed Motion clip must use MOTION_VIDEO");
        if(motion.outputAsset&&clip.asset.url!==motion.outputAsset.url)problems.push("wrong Motion output asset");
        if(motion.outputAsset&&clip.asset.sourceDurationSeconds!==motion.outputAsset.durationSeconds)problems.push("Motion source duration metadata changed");
        if(clip.asset.sourceDurationSeconds!==null&&clip.asset.sourceDurationSeconds+0.01<clip.durationSeconds)problems.push("source video shorter than timeline usage");
      }else if(motion.generationStatus==="SKIPPED"){
        if(clip.mediaType!=="STILL_HOLD")problems.push("SKIPPED Motion clip must use STILL_HOLD");
        if(clip.asset.url!==motion.inputAsset.url)problems.push("SKIPPED clip must use Storyboard still");
        if(clip.asset.sourceDurationSeconds!==null)problems.push("STILL_HOLD source duration must be null");
      }else problems.push("unresolved Motion clip cannot be assembled");

      const scriptById=new Map(context.script.blocks.map(b=>[b.id,b]));
      for(const id of clip.sourceScriptBlockIds)representedScript.add(id);
      for(const cue of clip.dialogueCues){
        const block=scriptById.get(cue.scriptBlockId);
        if(!block||block.type!=="DIALOGUE")problems.push("invalid dialogue Script block "+cue.scriptBlockId);
        else{
          if(block.characterId!==cue.characterId)problems.push("dialogue character mismatch");
          if(block.text!==cue.text)problems.push("dialogue text rewritten");
        }
        const animCue=anim.dialogueCues.find(c=>c.scriptBlockId===cue.scriptBlockId);
        if(!animCue)problems.push("dialogue cue missing from source Animatic");
        else if(Math.abs(cue.startSeconds-(clip.startSeconds+animCue.startOffsetSeconds))>.01)problems.push("dialogue global timestamp mismatch");
      }
      expectedClipStart+=clip.durationSeconds;
    }

    const actualDuration=scene.clips.reduce((sum,c)=>sum+c.durationSeconds,0);
    if(Math.abs(actualDuration-scene.durationSeconds)>.01)problems.push("scene duration mismatch");
    expectedSceneStart+=scene.durationSeconds;
    context.script.blocks.filter(b=>b.type==="ACTION"||b.type==="DIALOGUE"||b.type==="REACTION").forEach(b=>meaningfulScript.add(b.id));
  }

  for(const id of meaningfulScript)if(!representedScript.has(id))problems.push("meaningful Script block missing from Episode: "+id);
  if(Math.abs(expectedSceneStart-timeline.targetDurationSeconds)>.01)problems.push("Episode duration mismatch");
  if(!timeline.validation.hasVisualCoverage)problems.push("visual coverage must be complete");
  if(!timeline.validation.hasScriptCoverage)problems.push("Script coverage must be complete");
  if(JSON.stringify(timeline.continuityChecks.sourceSceneIds)!==JSON.stringify(timeline.scenes.map(s=>s.sceneId)))problems.push("sourceSceneIds mismatch");
  if(JSON.stringify(timeline.continuityChecks.sourceAnimaticIds)!==JSON.stringify(timeline.scenes.map(s=>s.animaticId)))problems.push("sourceAnimaticIds mismatch");
  if(JSON.stringify(timeline.continuityChecks.sourceMotionPlanIds)!==JSON.stringify(timeline.scenes.map(s=>s.motionPlanId)))problems.push("sourceMotionPlanIds mismatch");
  if(JSON.stringify(timeline.continuityChecks.protectedCanon)!==JSON.stringify(expectedCanon))problems.push("protected canon changed");
  if(JSON.stringify(timeline.continuityChecks.protectedMysteries)!==JSON.stringify(expectedMysteries))problems.push("protected mysteries changed");

  return problems.length?{success:false,problems}:{success:true,timeline};
}
