import {randomUUID} from "node:crypto";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {SceneBlueprint} from "@/lib/scenes/types";
import type {SceneScript} from "@/lib/scripts/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {StoryboardBlueprint} from "@/lib/storyboards/types";
import type {AnimaticTimeline} from "@/lib/animatics/types";
import type {MotionPlan} from "./types";

function shouldSkip(clip:AnimaticTimeline["clips"][number]){
  const intentionalStill=clip.motionTreatment==="STATIC"&&(/hold|still|quiet|pause|reaction|hesitat/i.test(clip.storyPurpose+" "+clip.emotionalFunction)||clip.actionCues.length===0);
  return intentionalStill&&clip.actionCues.length===0;
}

function cameraIntent(clip:AnimaticTimeline["clips"][number]){
  switch(clip.motionTreatment){
    case "SLOW_PUSH":return "A restrained slow push toward the existing focal subject. No cut.";
    case "SLOW_PULL":return "A restrained slow pull away from the existing focal subject. No cut.";
    case "PAN_LEFT":return "A gentle continuous pan left while preserving existing geography. No cut.";
    case "PAN_RIGHT":return "A gentle continuous pan right while preserving existing geography. No cut.";
    case "PAN_UP":return "A gentle continuous pan upward while preserving the source composition. No cut.";
    case "PAN_DOWN":return "A gentle continuous pan downward while preserving the source composition. No cut.";
    default:return "Locked camera. Preserve the source composition.";
  }
}

export function compileMotionPlan(input:{
  motionPlanId:string;version:number;series:SeriesBlueprint;scene:SceneBlueprint;script:SceneScript;visualPlan:VisualPlan;storyboard:StoryboardBlueprint;animatic:AnimaticTimeline;
}):MotionPlan{
  const panels=new Map(input.storyboard.panels.map(p=>[p.id,p]));
  const visualBeats=new Map(input.visualPlan.visualBeats.map(b=>[b.id,b]));

  const clips=input.animatic.clips.map((clip,index)=>{
    const panel=panels.get(clip.panelId);
    if(!panel||!panel.asset)throw new Error("MOTION_SOURCE_PANEL_INVALID");
    const visual=visualBeats.get(clip.sourceVisualBeatId);
    if(!visual)throw new Error("MOTION_SOURCE_VISUAL_BEAT_INVALID");
    const skip=shouldSkip(clip);
    const subjectMotion=skip
      ?"Preserve intentional stillness. Do not introduce character action."
      :visual.motionIntent==="CHAOTIC"
        ?"Controlled energetic motion matching only the scripted action."
        :visual.motionIntent==="ACTIVE"
          ?"Natural purposeful movement matching only the scripted action."
          :visual.motionIntent==="SUBTLE"
            ?"Subtle breathing, posture, fabric, and expression-level motion only where compatible with the source moment."
            :"Minimal subject movement; preserve pose and identity.";
    const environment=skip
      ?"Environment remains visually still."
      :visual.environmentFocus
        ?"Subtle ambient movement may support "+visual.environmentFocus+"; do not alter location identity."
        :"Only minimal ambient environmental motion; no new props or geography.";

    return{
      id:randomUUID(),
      animaticClipId:clip.id,
      storyboardPanelId:panel.id,
      sequenceIndex:index,
      sourceVisualBeatId:clip.sourceVisualBeatId,
      sourceScriptBlockIds:[...clip.sourceScriptBlockIds],
      inputAsset:{...clip.asset},
      targetDurationSeconds:clip.durationSeconds,
      motionIntent:{
        camera:cameraIntent(clip),
        subjectMotion,
        environmentalMotion:environment,
        emotionalIntent:clip.emotionalFunction,
        continuityNotes:[...panel.continuityRequirements,...panel.environmentRequirements]
      },
      generationStatus:skip?"SKIPPED" as const:"PENDING" as const,
      outputAsset:null
    };
  });

  return{
    id:input.motionPlanId,
    seriesId:input.animatic.seriesId,
    sceneId:input.animatic.sceneId,
    scriptId:input.animatic.scriptId,
    visualPlanId:input.animatic.visualPlanId,
    storyboardId:input.animatic.storyboardId,
    animaticId:input.animatic.id,
    version:input.version,
    identity:{title:input.animatic.identity.title.replace(/Animatic/i,"Motion Plan")},
    clips,
    continuityChecks:{
      characterRequirements:[...new Set(input.storyboard.panels.flatMap(p=>p.appearanceRequirements.flatMap(a=>a.requirements)))],
      environmentRequirements:[...new Set(input.storyboard.panels.flatMap(p=>p.environmentRequirements))],
      protectedCanon:[...input.storyboard.continuityChecks.protectedCanon],
      protectedMysteries:[...input.storyboard.continuityChecks.protectedMysteries]
    },
    confidence:{
      overall:Math.min(input.animatic.confidence.overall,input.visualPlan.confidence.overall,input.storyboard.confidence.overall),
      assumptions:[
        "Motion intent is derived deterministically from Animatic treatment, VisualPlan motion intent, and Storyboard continuity.",
        "SKIPPED clips intentionally preserve stillness and will fall back to their Storyboard still in Episode Assembly."
      ]
    }
  };
}
