import type { SupabaseClient } from "@supabase/supabase-js";
import { describe,expect,it } from "vitest";
import { buildValidVisualPlan } from "./fixtures";
import { saveVisualPlan } from "../persistence/saveVisualPlan";
import { listVisualPlans } from "../persistence/listVisualPlans";
import { updateVisualPlanStatus } from "../persistence/updateVisualPlan";
function insertClient(data:unknown,error:unknown=null){return{from:()=>({insert:()=>({select:()=>({single:async()=>({data,error})})})})} as unknown as SupabaseClient;}
function listClient(rows:unknown[]){const c={select:()=>c,eq:()=>c,order:async()=>({data:rows,error:null})};return{from:()=>c} as unknown as SupabaseClient;}
function updateClient(data:unknown,capture:Record<string,unknown>){const c={eq:()=>c,select:()=>c,maybeSingle:async()=>({data,error:null})};return{from:()=>({update:(v:Record<string,unknown>)=>{Object.assign(capture,v);return c;}})} as unknown as SupabaseClient;}
const ids={creatorId:"u",seriesId:"22222222-2222-4222-8222-222222222222",sceneId:"11111111-1111-4111-8111-111111111111",scriptId:"33333333-3333-4333-8333-333333333333"};
describe("visual plan persistence",()=>{
 it("persists v1",async()=>{const r=await saveVisualPlan(insertClient({id:"55555555-5555-4555-8555-555555555555",version:1,status:"DRAFT",updated_at:"x"}),{...ids,plan:buildValidVisualPlan(),generationSource:"llm"});expect(r.version).toBe(1);});
 it("reuses duplicate version",async()=>{const r=await saveVisualPlan(insertClient(null,{code:"23505"}),{...ids,plan:buildValidVisualPlan(),generationSource:"llm"});expect(r.reused).toBe(true);});
 it("lists summaries only",async()=>{const r=await listVisualPlans(listClient([{id:"p",version:1,status:"DRAFT",plan:buildValidVisualPlan(),updated_at:"x"}]),"u",ids.seriesId,ids.sceneId,ids.scriptId);expect(r[0].visualBeatCount).toBe(4);expect(r[0]).not.toHaveProperty("plan");});
 it("sums duration in summaries",async()=>{const r=await listVisualPlans(listClient([{id:"p",version:1,status:"DRAFT",plan:buildValidVisualPlan(),updated_at:"x"}]),"u",ids.seriesId,ids.sceneId,ids.scriptId);expect(r[0].estimatedDurationSeconds).toBe(18);});
 it("updates status without plan overwrite",async()=>{const cap:Record<string,unknown>={};await updateVisualPlanStatus(updateClient({id:"p",version:1,status:"APPROVED",updated_at:"x",archived_at:null},cap),{...ids,planId:"p",status:"APPROVED"});expect(cap.status).toBe("APPROVED");expect(cap).not.toHaveProperty("plan");});
 it("archives explicitly",async()=>{const cap:Record<string,unknown>={};await updateVisualPlanStatus(updateClient({id:"p",version:1,status:"ARCHIVED",updated_at:"x",archived_at:"x"},cap),{...ids,planId:"p",status:"ARCHIVED"});expect(typeof cap.archived_at).toBe("string");});
});