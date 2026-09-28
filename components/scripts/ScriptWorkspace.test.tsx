import { render,screen } from "@testing-library/react";
import { describe,expect,it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { buildValidScript } from "@/lib/scripts/__tests__/fixtures";
import { ScriptWorkspace } from "./ScriptWorkspace";
const versions=[{id:"33333333-3333-4333-8333-333333333333",version:1,status:"DRAFT" as const,estimatedDurationSeconds:18,updatedAt:"x"}];
describe("ScriptWorkspace",()=>{
 it("renders dialogue with human character names",()=>{render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep}/>);expect(screen.getByText("Orin")).toBeInTheDocument();});
 it("renders action as readable prose",()=>{render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep}/>);expect(screen.getByText(/tightens the bandage/i)).toBeInTheDocument();});
 it("shows Draft v1",()=>{render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep}/>);expect(screen.getByRole("option",{name:"Draft v1"})).toBeInTheDocument();});
 it("enables Plan Visuals without an existing plan",()=>{render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep}/>);expect(screen.getByRole("button",{name:"Plan Visuals"})).toBeEnabled();});
 it("shows Continue Visual Plan when one exists",()=>{render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep} latestVisualPlan={{id:"55555555-5555-4555-8555-555555555555",version:1,status:"DRAFT",visualBeatCount:4,estimatedDurationSeconds:18,updatedAt:"x"}}/>);expect(screen.getByRole("button",{name:"Continue Visual Plan"})).toBeEnabled();});
 it("does not expose prompt/model terminology",()=>{const {container}=render(<ScriptWorkspace script={buildValidScript()} versions={versions} series={theWoundsWeKeep}/>);expect(container.textContent).not.toContain("imagePrompt");expect(container.textContent).not.toContain("OPENAI_VISUAL_PLAN_MODEL");});
});