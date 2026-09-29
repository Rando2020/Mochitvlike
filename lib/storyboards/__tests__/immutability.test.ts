import {describe,expect,it} from "vitest";
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildValidScene} from "@/lib/scenes/__tests__/fixtures";
import {buildValidScript} from "@/lib/scripts/__tests__/fixtures";
import {buildValidVisualPlan} from "@/lib/visual-planning/__tests__/fixtures";
import {compileStoryboardBlueprint} from "../compileStoryboardBlueprint";
describe("storyboard derivation safety",()=>{
 it("does not mutate Series, Scene, Script, VisualPlan, or canon",()=>{
  const series=structuredClone(theWoundsWeKeep),scene=buildValidScene(),script=buildValidScript(),visual=buildValidVisualPlan();
  const before=[JSON.stringify(series),JSON.stringify(scene),JSON.stringify(script),JSON.stringify(visual),JSON.stringify(series.canon)];
  compileStoryboardBlueprint({storyboardId:"66666666-6666-4666-8666-666666666666",seriesId:"22222222-2222-4222-8222-222222222222",sceneId:scene.id,scriptId:script.id,visualPlanId:visual.id,version:1,series,scene,script,visualPlan:visual});
  expect([JSON.stringify(series),JSON.stringify(scene),JSON.stringify(script),JSON.stringify(visual),JSON.stringify(series.canon)]).toEqual(before);
 });
 it("contains no video-generation fields",()=>{
  const text=JSON.stringify(compileStoryboardBlueprint({storyboardId:"66666666-6666-4666-8666-666666666666",seriesId:"22222222-2222-4222-8222-222222222222",sceneId:buildValidScene().id,scriptId:buildValidScript().id,visualPlanId:buildValidVisualPlan().id,version:1,series:theWoundsWeKeep,scene:buildValidScene(),script:buildValidScript(),visualPlan:buildValidVisualPlan()}).blueprint);
  expect(text).not.toContain("videoPrompt");expect(text).not.toContain("animationModel");
 });
});