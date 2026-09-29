import type {SupabaseClient} from "@supabase/supabase-js";
import {describe,expect,it} from "vitest";
import {getEpisodeAssembly,getLatestEpisodeAssembly} from "../persistence";
import {createEpisodePreviewRenderer} from "../previewRenderer";
import {buildValidEpisodeTimeline} from "./fixtures";

function client(row:any){
 const chain:any={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>chain,maybeSingle:async()=>({data:row,error:null})};
 return{from:()=>chain} as unknown as SupabaseClient;
}
describe("Episode persistence and renderer",()=>{
 it("reads a versioned Episode Assembly",async()=>{const f=buildValidEpisodeTimeline();const row={id:f.episodeTimeline.id,series_id:f.episodeTimeline.seriesId,episode_key:"episodeOne",creator_id:"u",version:1,status:"READY",timeline:f.episodeTimeline,timeline_schema_version:"1.0",preview_storage_path:null,preview_url:null,preview_mime_type:null,created_at:"x",updated_at:"x",archived_at:null};expect((await getEpisodeAssembly(client(row),"u",row.id)).version).toBe(1);});
 it("reads latest v1 without overwriting history",async()=>{const f=buildValidEpisodeTimeline();const row={id:f.episodeTimeline.id,series_id:f.episodeTimeline.seriesId,episode_key:"episodeOne",creator_id:"u",version:1,status:"READY",timeline:f.episodeTimeline,timeline_schema_version:"1.0",preview_storage_path:null,preview_url:null,preview_mime_type:null,created_at:"x",updated_at:"x",archived_at:null};expect((await getLatestEpisodeAssembly(client(row),"u",row.series_id,"episodeOne"))?.id).toBe(row.id);});
 it("uses browser-only preview fallback",async()=>{const f=buildValidEpisodeTimeline();await expect(createEpisodePreviewRenderer().render(f.episodeTimeline)).rejects.toThrow("EPISODE_PREVIEW_RENDERER_NOT_CONFIGURED");});
});
