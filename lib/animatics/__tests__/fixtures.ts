import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildValidScene} from "@/lib/scenes/__tests__/fixtures";
import {buildValidScript} from "@/lib/scripts/__tests__/fixtures";
import {buildValidVisualPlan} from "@/lib/visual-planning/__tests__/fixtures";
import {compileStoryboardBlueprint} from "@/lib/storyboards/compileStoryboardBlueprint";
import {compileAnimaticTimeline} from "../compileAnimaticTimeline";

export function buildCompletedStoryboard(){
  const scene=buildValidScene(),script=buildValidScript(),visualPlan=buildValidVisualPlan();
  const storyboard=compileStoryboardBlueprint({
    storyboardId:"66666666-6666-4666-8666-666666666666",
    seriesId:"22222222-2222-4222-8222-222222222222",
    sceneId:scene.id,scriptId:script.id,visualPlanId:visualPlan.id,version:1,
    series:theWoundsWeKeep,scene,script,visualPlan
  }).blueprint;
  storyboard.panels.forEach((panel,index)=>{
    panel.generationStatus="COMPLETED";
    panel.asset={url:`https://example.com/panel-${index}.png`,storagePath:`panel-${index}.png`,width:1536,height:1024,mimeType:"image/png"};
  });
  return{series:structuredClone(theWoundsWeKeep),scene,script,visualPlan,storyboard};
}

export function buildValidAnimatic(){
  const f=buildCompletedStoryboard();
  const timeline=compileAnimaticTimeline({
    animaticId:"77777777-7777-4777-8777-777777777777",version:1,
    series:f.series,scene:f.scene,script:f.script,visualPlan:f.visualPlan,storyboard:f.storyboard,storyboardStatus:"READY"
  });
  return{...f,timeline};
}
