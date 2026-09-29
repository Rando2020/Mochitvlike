import {fireEvent,render,screen} from "@testing-library/react";
import {describe,expect,it,vi} from "vitest";
import {buildValidMotion} from "@/lib/motion/__tests__/fixtures";
import {MotionWorkspace} from "./MotionWorkspace";

describe("MotionWorkspace",()=>{
 it("shows waiting state",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="GENERATING" statusEndpoint="/status" retryBase="/status"/>);expect(screen.getAllByText(/Waiting|Held as still/).length).toBeGreaterThan(0);});
 it("renders generated preview",()=>{const f=buildValidMotion();const c=f.plan.clips.find(x=>x.generationStatus==="PENDING");if(!c)return;c.generationStatus="COMPLETED";c.outputAsset={url:"https://example.com/m.mp4",storagePath:"m.mp4",durationSeconds:4,width:1280,height:720,mimeType:"video/mp4"};render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" statusEndpoint="/status" retryBase="/status"/>);expect(document.querySelector("video")).toBeTruthy();});
 it("renders failed retry UI",()=>{const f=buildValidMotion();const c=f.plan.clips.find(x=>x.generationStatus==="PENDING");if(!c)return;c.generationStatus="FAILED";render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" statusEndpoint="/status" retryBase="/status"/>);expect(screen.getByRole("button",{name:"Retry motion"})).toBeInTheDocument();});
 it("shows SKIPPED fallback as Held as still",()=>{const f=buildValidMotion();const c=f.plan.clips[0];c.generationStatus="SKIPPED";render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" statusEndpoint="/status" retryBase="/status"/>);expect(screen.getAllByText("Held as still").length).toBeGreaterThan(0);});
 it("shows progress",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="GENERATING" statusEndpoint="/status" retryBase="/status"/>);expect(screen.getByText(/% ready/)).toBeInTheDocument();});
 it("keeps Assemble Episode disabled",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="READY" statusEndpoint="/status" retryBase="/status"/>);expect(screen.getByRole("button",{name:"Assemble Episode"})).toBeDisabled();});
 it("can select another clip",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" statusEndpoint="/status" retryBase="/status"/>);if(f.plan.clips[1]){fireEvent.click(screen.getByText("02"));expect(screen.getByText(/Clip 2/)).toBeInTheDocument();}});
});
