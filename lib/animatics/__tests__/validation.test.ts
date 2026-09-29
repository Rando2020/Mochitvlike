import {describe,expect,it} from "vitest";
import {validateAnimaticTimeline} from "../validateAnimaticTimeline";
import {buildValidAnimatic} from "./fixtures";
function validate(timeline:any,f=buildValidAnimatic()){return validateAnimaticTimeline(timeline,f.script,f.visualPlan,f.storyboard,{animaticId:"77777777-7777-4777-8777-777777777777",seriesId:f.storyboard.seriesId,sceneId:f.storyboard.sceneId,scriptId:f.storyboard.scriptId,visualPlanId:f.storyboard.visualPlanId,storyboardId:f.storyboard.id,version:1});}
describe("Animatic validation",()=>{
 it("accepts valid timeline",()=>{const f=buildValidAnimatic();expect(validate(f.timeline,f).success).toBe(true);});
 it("rejects duplicate clip IDs",()=>{const f=buildValidAnimatic();if(f.timeline.clips[1])f.timeline.clips[1].id=f.timeline.clips[0].id;expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects invalid panel",()=>{const f=buildValidAnimatic();f.timeline.clips[0].panelId="99999999-9999-4999-8999-999999999999";expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects incomplete panel asset",()=>{const f=buildValidAnimatic();f.storyboard.panels[0].asset=null;f.storyboard.panels[0].generationStatus="FAILED";const r=validateAnimaticTimeline(f.timeline,f.script,f.visualPlan,f.storyboard,{animaticId:f.timeline.id,seriesId:f.timeline.seriesId,sceneId:f.timeline.sceneId,scriptId:f.timeline.scriptId,visualPlanId:f.timeline.visualPlanId,storyboardId:f.timeline.storyboardId,version:1});expect(r.success).toBe(false);});
 it("rejects rewritten dialogue",()=>{const f=buildValidAnimatic();const cue=f.timeline.clips.flatMap(c=>c.dialogueCues)[0];cue.text+=" changed";expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects invalid dialogue character",()=>{const f=buildValidAnimatic();const cue=f.timeline.clips.flatMap(c=>c.dialogueCues)[0];cue.characterId="char_wrong";expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects overlap",()=>{const f=buildValidAnimatic();if(f.timeline.clips[1])f.timeline.clips[1].startSeconds=0;expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects zero duration structurally",()=>{const f=buildValidAnimatic();f.timeline.clips[0].durationSeconds=0;expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects duration far below tolerance",()=>{const f=buildValidAnimatic();f.timeline.clips.forEach((c,i)=>{c.startSeconds=i;c.durationSeconds=.1});f.timeline.pacingChecks.timelineDurationSeconds=.4;expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects duration far above tolerance",()=>{const f=buildValidAnimatic();let cursor=0;f.timeline.clips.forEach(c=>{c.startSeconds=cursor;c.durationSeconds=20;cursor+=20});f.timeline.pacingChecks.timelineDurationSeconds=cursor;expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects motion strength above 1",()=>{const f=buildValidAnimatic();f.timeline.clips[0].motionStrength=1.2;expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects generative-video field",()=>{const f=buildValidAnimatic();const raw={...f.timeline,videoModel:"x"};expect(validate(raw).success).toBe(false);});
 it("rejects missing meaningful Script coverage",()=>{const f=buildValidAnimatic();f.timeline.clips[0].sourceScriptBlockIds=[];expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects mismatched parent IDs",()=>{const f=buildValidAnimatic();f.timeline.storyboardId="88888888-8888-4888-8888-888888888888";expect(validate(f.timeline,f).success).toBe(false);});
 it("rejects non-monotonic sequence",()=>{const f=buildValidAnimatic();if(f.timeline.clips[1])f.timeline.clips[1].sequenceIndex=8;expect(validate(f.timeline,f).success).toBe(false);});
});
