import {describe,expect,it} from "vitest";
import {buildValidMotion} from "./fixtures";
import {validateMotionPlan} from "../validateMotionPlan";
import {TechnicalMotionQualityValidator} from "../quality";

function validate(plan:any,f=buildValidMotion()){return validateMotionPlan(plan,f.timeline,f.storyboard,f.visualPlan,{motionPlanId:"99999999-9999-4999-8999-999999999999",seriesId:f.plan.seriesId,sceneId:f.plan.sceneId,scriptId:f.plan.scriptId,visualPlanId:f.plan.visualPlanId,storyboardId:f.plan.storyboardId,animaticId:f.plan.animaticId,version:1});}
describe("Motion validation",()=>{
 it("accepts valid plan",()=>{const f=buildValidMotion();expect(validate(f.plan,f).success).toBe(true);});
 it("rejects changed target duration",()=>{const f=buildValidMotion();f.plan.clips[0].targetDurationSeconds+=1;expect(validate(f.plan,f).success).toBe(false);});
 it("rejects changed panel identity",()=>{const f=buildValidMotion();f.plan.clips[0].storyboardPanelId="88888888-8888-4888-8888-888888888888";expect(validate(f.plan,f).success).toBe(false);});
 it("rejects duplicate clip IDs",()=>{const f=buildValidMotion();if(f.plan.clips[1])f.plan.clips[1].id=f.plan.clips[0].id;expect(validate(f.plan,f).success).toBe(false);});
 it("rejects extra schema fields",()=>{const f=buildValidMotion();expect(validate({...f.plan,audioPrompt:"x"},f).success).toBe(false);});
 it("technical validator accepts sane mp4 metadata",async()=>{const q=await new TechnicalMotionQualityValidator().validate({video:{bytes:new Uint8Array(2048),mimeType:"video/mp4",durationSeconds:4,width:1280,height:720,provider:"x",model:"x",providerTaskId:"t"},expectedDurationSeconds:3.2});expect(q.ok).toBe(true);});
 it("technical validator does not claim semantic validation",async()=>{const q=await new TechnicalMotionQualityValidator().validate({video:{bytes:new Uint8Array(2048),mimeType:"video/mp4",durationSeconds:4,width:1280,height:720,provider:"x",model:"x",providerTaskId:"t"},expectedDurationSeconds:3});expect(q.checks.some(x=>/identity|character/i.test(x))).toBe(false);});
});
