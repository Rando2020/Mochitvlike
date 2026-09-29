import { render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScript } from "@/lib/scripts/__tests__/fixtures";
import { buildValidVisualPlan } from "@/lib/visual-planning/__tests__/fixtures";
import { VisualPlanningWorkspace } from "./VisualPlanningWorkspace";
const versions=[{id:"55555555-5555-4555-8555-555555555555",version:1,status:"DRAFT" as const,visualBeatCount:4,estimatedDurationSeconds:18,updatedAt:"x"}];
describe("VisualPlanningWorkspace",()=>{
 it("renders visual beats",()=>{render(<VisualPlanningWorkspace plan={buildValidVisualPlan()} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(screen.getByText("Establish ordinary medicine failing.")).toBeInTheDocument();});
 it("renders source dialogue humanly",()=>{render(<VisualPlanningWorkspace plan={buildValidVisualPlan()} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(screen.getByText(/I'm thinking/)).toBeInTheDocument();});
 it("shows Creative DNA",()=>{render(<VisualPlanningWorkspace plan={buildValidVisualPlan()} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(screen.getByText("Creative DNA")).toBeInTheDocument();});
 it("shows character positions",()=>{render(<VisualPlanningWorkspace plan={buildValidVisualPlan()} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(screen.getByText("Character positions")).toBeInTheDocument();});
 it("hides prompt terminology",()=>{const {container}=render(<VisualPlanningWorkspace plan={buildValidVisualPlan()} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(container.textContent).not.toContain("imagePrompt");expect(container.textContent).not.toContain("provider");});
 it("keeps Generate Storyboard disabled",()=>{render(<VisualPlanningWorkspace plan={buildValidVisualPlan()} versions={versions} script={buildValidScript()} series={theWoundsWeKeep}/>);expect(screen.getByRole("button",{name:"Generate Storyboard"})).toBeDisabled();});
});