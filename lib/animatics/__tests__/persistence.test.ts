import type {SupabaseClient} from "@supabase/supabase-js";
import {describe,expect,it} from "vitest";
import {getLatestAnimatic,listAnimatics} from "../persistence";
import {buildValidAnimatic} from "./fixtures";

function chainClient(row:any){
 const chain:any={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>chain,maybeSingle:async()=>({data:row,error:null})};
 return{from:()=>chain} as unknown as SupabaseClient;
}
function listClient(rows:any[]){
 const chain:any={select:()=>chain,eq:()=>chain,order:async()=>({data:rows,error:null})};
 return{from:()=>chain} as unknown as SupabaseClient;
}
describe("Animatic persistence",()=>{
 it("reads latest Animatic",async()=>{const f=buildValidAnimatic();const row={id:f.timeline.id,series_id:f.timeline.seriesId,scene_id:f.timeline.sceneId,script_id:f.timeline.scriptId,visual_plan_id:f.timeline.visualPlanId,storyboard_id:f.timeline.storyboardId,creator_id:"u",version:1,status:"READY",timeline:f.timeline,timeline_schema_version:"1.0",preview_storage_path:null,preview_url:null,preview_mime_type:null,created_at:"x",updated_at:"x",archived_at:null};expect((await getLatestAnimatic(chainClient(row),"u",f.timeline.storyboardId))?.version).toBe(1);});
 it("returns null with no latest Animatic",async()=>expect(await getLatestAnimatic(chainClient(null),"u","s")).toBeNull());
 it("lists summaries without timeline JSON",async()=>{const f=buildValidAnimatic();const rows=[{id:f.timeline.id,version:1,status:"READY",timeline:f.timeline,updated_at:"x"}];const list=await listAnimatics(listClient(rows),"u",f.timeline.storyboardId);expect(list[0].timelineDurationSeconds).toBe(f.timeline.pacingChecks.timelineDurationSeconds);expect(list[0]).not.toHaveProperty("timeline");});
});

