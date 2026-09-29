import {describe,expect,it} from "vitest";
import {buildValidMotion} from "./fixtures";
import {buildMotionGenerationSpec} from "../buildMotionGenerationSpec";
import {buildMotionPrompt} from "../prompts/buildMotionPrompt";
import {mapTargetToRunwayDuration} from "../duration";

function spec(){const f=buildValidMotion();const clip=f.plan.clips.find(c=>c.generationStatus==="PENDING");if(!clip)throw new Error("fixture needs pending clip");return buildMotionGenerationSpec({series:f.series,scene:f.scene,visualPlan:f.visualPlan,storyboard:f.storyboard,motionPlan:f.plan,motionClipId:clip.id});}
describe("Motion prompt and duration",()=>{
 it("prompt is deterministic",()=>{const s=spec();expect(buildMotionPrompt(s).prompt).toBe(buildMotionPrompt(s).prompt);});
 it("checksum is deterministic",()=>{const s=spec();expect(buildMotionPrompt(s).promptChecksum).toBe(buildMotionPrompt(s).promptChecksum);});
 it("style change changes checksum",()=>{const s=spec(),b=structuredClone(s);b.creativeDirection.lighting+=" neon";expect(buildMotionPrompt(s).promptChecksum).not.toBe(buildMotionPrompt(b).promptChecksum);});
 it("blocks character drift",()=>expect(buildMotionPrompt(spec()).negativeConstraints.join(" ")).toMatch(/identity drift.*face drift/i));
 it("blocks extra characters",()=>expect(buildMotionPrompt(spec()).negativeConstraints.join(" ")).toMatch(/add new people/i));
 it("blocks text and watermark",()=>expect(buildMotionPrompt(spec()).negativeConstraints.join(" ")).toMatch(/text.*watermarks/i));
 it("does not contain runtime system prompt field",()=>expect(buildMotionPrompt(spec()).prompt).not.toContain("system_prompt"));
 it("does not contain private memory field",()=>expect(buildMotionPrompt(spec()).prompt).not.toContain("private memory"));
 it("maps sub-2s target to 2s provider bucket",()=>expect(mapTargetToRunwayDuration(1.2)).toBe(2));
 it("rounds target upward",()=>expect(mapTargetToRunwayDuration(3.2)).toBe(4));
 it("caps provider duration at 10s",()=>expect(mapTargetToRunwayDuration(15)).toBe(10));
 it("never changes MotionPlan target duration",()=>{const f=buildValidMotion();const target=f.plan.clips[0].targetDurationSeconds;mapTargetToRunwayDuration(target);expect(f.plan.clips[0].targetDurationSeconds).toBe(target);});
});
