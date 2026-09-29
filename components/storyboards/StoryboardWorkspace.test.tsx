import {fireEvent,render,screen} from "@testing-library/react";
import {describe,expect,it,vi,beforeEach} from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildValidScene} from "@/lib/scenes/__tests__/fixtures";
import {buildValidScript} from "@/lib/scripts/__tests__/fixtures";
import {buildValidVisualPlan} from "@/lib/visual-planning/__tests__/fixtures";
import {compileStoryboardBlueprint} from "@/lib/storyboards/compileStoryboardBlueprint";
import {StoryboardWorkspace} from "./StoryboardWorkspace";
const script=buildValidScript(),visual=buildValidVisualPlan(),scene=buildValidScene();
const blueprint=compileStoryboardBlueprint({storyboardId:"66666666-6666-4666-8666-666666666666",seriesId:"22222222-2222-4222-8222-222222222222",sceneId:scene.id,scriptId:script.id,visualPlanId:visual.id,version:1,series:theWoundsWeKeep,scene,script,visualPlan:visual}).blueprint;
beforeEach(()=>vi.restoreAllMocks());
describe("StoryboardWorkspace",()=>{
 it("shows skeleton state",()=>{render(<StoryboardWorkspace initialStoryboard={blueprint} initialStatus="GENERATING" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(screen.getAllByText("Planning image…").length).toBeGreaterThan(0);});
 it("renders ready panel asset",()=>{const b=structuredClone(blueprint);b.panels[0].generationStatus="COMPLETED";b.panels[0].asset={url:"https://example.com/p.png",storagePath:"p",width:1536,height:1024,mimeType:"image/png"};render(<StoryboardWorkspace initialStoryboard={b} initialStatus="READY" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(screen.getByAltText(/Storyboard panel 1/)).toBeInTheDocument();});
 it("renders failed retry UI",()=>{const b=structuredClone(blueprint);b.panels[0].generationStatus="FAILED";render(<StoryboardWorkspace initialStoryboard={b} initialStatus="PARTIAL" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(screen.getByRole("button",{name:"Retry panel"})).toBeInTheDocument();});
 it("renders source moment details",()=>{render(<StoryboardWorkspace initialStoryboard={blueprint} initialStatus="READY" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);fireEvent.click(screen.getAllByText("Panel details")[0]);expect(screen.getAllByText(/bandage/i).length).toBeGreaterThan(0);});
 it("renders panel ordering",()=>{render(<StoryboardWorkspace initialStoryboard={blueprint} initialStatus="READY" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(screen.getByText("01")).toBeInTheDocument();expect(screen.getByText("04")).toBeInTheDocument();});
 it("hides raw prompt and queue internals",()=>{const {container}=render(<StoryboardWorkspace initialStoryboard={blueprint} initialStatus="READY" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(container.textContent).not.toContain("claim_token");expect(container.textContent).not.toContain("promptChecksum");});
 it("enables Continue to Animatic for READY",()=>{render(<StoryboardWorkspace initialStoryboard={blueprint} initialStatus="READY" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(screen.getByRole("button",{name:"Continue to Animatic"})).toBeEnabled();});
 it("disables Continue to Animatic while GENERATING",()=>{render(<StoryboardWorkspace initialStoryboard={blueprint} initialStatus="GENERATING" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(screen.getByRole("button",{name:"Continue to Animatic"})).toBeDisabled();});
 it("shows Open Animatic when one exists",()=>{render(<StoryboardWorkspace initialStoryboard={blueprint} initialStatus="READY" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep} latestAnimatic={{id:"77777777-7777-4777-8777-777777777777"}}/>);expect(screen.getByRole("button",{name:"Open Animatic"})).toBeEnabled();});
 it("shows completed progress",()=>{const b=structuredClone(blueprint);b.panels.forEach(p=>{p.generationStatus="COMPLETED";p.asset={url:"https://x/"+p.id,storagePath:p.id,width:1536,height:1024,mimeType:"image/png"}});render(<StoryboardWorkspace initialStoryboard={b} initialStatus="READY" statusEndpoint="/status" retryBase="/api/series/x" script={script} series={theWoundsWeKeep}/>);expect(screen.getByText("100% ready")).toBeInTheDocument();});
});

