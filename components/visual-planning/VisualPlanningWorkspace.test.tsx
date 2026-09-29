import {render,screen} from "@testing-library/react";
import {describe,expect,it} from "vitest";
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildValidScript} from "@/lib/scripts/__tests__/fixtures";
import {buildValidVisualPlan} from "@/lib/visual-planning/__tests__/fixtures";
import {VisualPlanningWorkspace} from "./VisualPlanningWorkspace";
const plan=buildValidVisualPlan(),versions=[{id:plan.id,version:1,status:"DRAFT" as const,visualBeatCount:4,estimatedDurationSeconds:18,updatedAt:"x"}];
describe("VisualPlanningWorkspace storyboard integration",()=>{
 it("enables Generate Storyboard",()=>{render(<VisualPlanningWorkspace plan={plan} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(screen.getByRole("button",{name:"Generate Storyboard"})).toBeEnabled();});
 it("shows Continue Storyboard when durable work exists",()=>{render(<VisualPlanningWorkspace plan={plan} versions={versions} script={buildValidScript()} series={theWoundsWeKeep} latestStoryboard={{id:"66666666-6666-4666-8666-666666666666",status:"GENERATING",panelCount:4,completedPanels:1}}/>);expect(screen.getByRole("button",{name:"Continue Storyboard"})).toBeEnabled();});
 it("still renders visual beats",()=>{render(<VisualPlanningWorkspace plan={plan} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(screen.getByText("Establish ordinary medicine failing.")).toBeInTheDocument();});
 it("does not expose raw prompt",()=>{const {container}=render(<VisualPlanningWorkspace plan={plan} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(container.textContent).not.toContain("promptChecksum");});
});