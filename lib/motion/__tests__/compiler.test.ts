import {describe,expect,it} from "vitest";
import {buildValidMotion} from "./fixtures";
import {compileMotionPlan} from "../compileMotionPlan";
import {buildMotionGenerationSpec} from "../buildMotionGenerationSpec";

describe("MotionPlan compiler",()=>{
 it("consumes Animatic",()=>{const f=buildValidMotion();expect(f.plan.animaticId).toBe(f.timeline.id);});
 it("preserves order",()=>{const f=buildValidMotion();expect(f.plan.clips.map(c=>c.sequenceIndex)).toEqual(f.timeline.clips.map(c=>c.sequenceIndex));});
 it("preserves durations",()=>{const f=buildValidMotion();expect(f.plan.clips.map(c=>c.targetDurationSeconds)).toEqual(f.timeline.clips.map(c=>c.durationSeconds));});
 it("preserves Script traceability",()=>{const f=buildValidMotion();expect(f.plan.clips.map(c=>c.sourceScriptBlockIds)).toEqual(f.timeline.clips.map(c=>c.sourceScriptBlockIds));});
 it("preserves VisualBeat traceability",()=>{const f=buildValidMotion();expect(f.plan.clips.map(c=>c.sourceVisualBeatId)).toEqual(f.timeline.clips.map(c=>c.sourceVisualBeatId));});
 it("preserves panel identity",()=>{const f=buildValidMotion();expect(f.plan.clips.map(c=>c.storyboardPanelId)).toEqual(f.timeline.clips.map(c=>c.panelId));});
 it("static non-action clip may be SKIPPED",()=>{const f=buildValidMotion();const source=structuredClone(f.timeline);source.clips[0].motionTreatment="STATIC";source.clips[0].actionCues=[];source.clips[0].storyPurpose="Quiet hold";const p=compileMotionPlan({motionPlanId:"88888888-8888-4888-8888-888888888888",version:1,series:f.series,scene:f.scene,script:f.script,visualPlan:f.visualPlan,storyboard:f.storyboard,animatic:source});expect(p.clips[0].generationStatus).toBe("SKIPPED");});
 it("action clip stays eligible",()=>{const f=buildValidMotion();const action=f.plan.clips.find((_,i)=>f.timeline.clips[i].actionCues.length>0);if(action)expect(action.generationStatus).toBe("PENDING");});
 it("inherits protected mysteries",()=>{const f=buildValidMotion();expect(f.plan.continuityChecks.protectedMysteries).toEqual(f.storyboard.continuityChecks.protectedMysteries);});
 it("does not mutate parents or canon",()=>{const f=buildValidMotion();const before=[JSON.stringify(f.series),JSON.stringify(f.scene),JSON.stringify(f.script),JSON.stringify(f.visualPlan),JSON.stringify(f.storyboard),JSON.stringify(f.timeline),JSON.stringify(f.series.canon)];compileMotionPlan({motionPlanId:"88888888-8888-4888-8888-888888888888",version:1,series:f.series,scene:f.scene,script:f.script,visualPlan:f.visualPlan,storyboard:f.storyboard,animatic:f.timeline});expect([JSON.stringify(f.series),JSON.stringify(f.scene),JSON.stringify(f.script),JSON.stringify(f.visualPlan),JSON.stringify(f.storyboard),JSON.stringify(f.timeline),JSON.stringify(f.series.canon)]).toEqual(before);});
 it("generation spec inherits Creative DNA",()=>{const f=buildValidMotion();const clip=f.plan.clips.find(c=>c.generationStatus==="PENDING");if(!clip)return;const s=buildMotionGenerationSpec({series:f.series,scene:f.scene,visualPlan:f.visualPlan,storyboard:f.storyboard,motionPlan:f.plan,motionClipId:clip.id});expect(s.creativeDirection.visualStyleDescription).toBe(f.series.creativeDNA.visualStyle.description);});
 it("generation spec includes relevant character visuals",()=>{const f=buildValidMotion();const clip=f.plan.clips.find(c=>c.generationStatus==="PENDING");if(!clip)return;const s=buildMotionGenerationSpec({series:f.series,scene:f.scene,visualPlan:f.visualPlan,storyboard:f.storyboard,motionPlan:f.plan,motionClipId:clip.id});expect(s.characterConstraints.every(c=>Boolean(c.visualDescription))).toBe(true);});
 it("generation spec inherits location continuity",()=>{const f=buildValidMotion();const clip=f.plan.clips.find(c=>c.generationStatus==="PENDING");if(!clip)return;const s=buildMotionGenerationSpec({series:f.series,scene:f.scene,visualPlan:f.visualPlan,storyboard:f.storyboard,motionPlan:f.plan,motionClipId:clip.id});expect(s.environmentConstraints.continuityRequirements).toBeDefined();});
});
