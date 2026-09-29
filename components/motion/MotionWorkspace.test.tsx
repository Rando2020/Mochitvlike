import {fireEvent,render,screen} from "@testing-library/react";
import {describe,expect,it,vi} from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
import {buildValidMotion} from "@/lib/motion/__tests__/fixtures";
import {MotionWorkspace} from "./MotionWorkspace";

const props={statusEndpoint:"/status",retryBase:"/status",assemblyBase:"/api/series/s/episodes/episodeOne"};
describe("MotionWorkspace",()=>{
 it("shows waiting state",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="GENERATING" {...props}/>);expect(screen.getAllByText(/Waiting|Held as still/).length).toBeGreaterThan(0);});
 it("renders generated preview",()=>{const f=buildValidMotion();const c=f.plan.clips.find(x=>x.generationStatus==="PENDING");if(!c)return;c.generationStatus="COMPLETED";c.outputAsset={url:"https://example.com/m.mp4",storagePath:"m.mp4",durationSeconds:4,width:1280,height:720,mimeType:"video/mp4"};render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" {...props}/>);expect(document.querySelector("video")).toBeTruthy();});
 it("renders failed retry UI",()=>{const f=buildValidMotion();const c=f.plan.clips.find(x=>x.generationStatus==="PENDING");if(!c)return;c.generationStatus="FAILED";render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" {...props}/>);expect(screen.getByRole("button",{name:"Retry motion"})).toBeInTheDocument();});
 it("shows SKIPPED fallback as Held as still",()=>{const f=buildValidMotion();const c=f.plan.clips[0];c.generationStatus="SKIPPED";render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" {...props}/>);expect(screen.getAllByText("Held as still").length).toBeGreaterThan(0);});
 it("shows progress",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="GENERATING" {...props}/>);expect(screen.getByText(/% ready/)).toBeInTheDocument();});
 it("enables Assemble Episode only when READY",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="READY" {...props}/>);expect(screen.getByRole("button",{name:"Assemble Episode"})).toBeEnabled();});
 it("disables Assemble Episode while incomplete",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" {...props}/>);expect(screen.getByRole("button",{name:"Assemble Episode"})).toBeDisabled();});
 it("shows Open Episode Assembly when one exists",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="READY" {...props} latestAssembly={{id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}}/>);expect(screen.getByRole("button",{name:"Open Episode Assembly"})).toBeEnabled();});
 it("can select another clip",()=>{const f=buildValidMotion();render(<MotionWorkspace initialPlan={f.plan} initialStatus="PARTIAL" {...props}/>);if(f.plan.clips[1]){fireEvent.click(screen.getByText("02"));expect(screen.getByText(/Clip 2/)).toBeInTheDocument();}});
});
