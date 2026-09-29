import {NextRequest} from "next/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/episodes/assembly/persistence",()=>({getEpisodeAssembly:vi.fn()}));
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getEpisodeAssembly} from "@/lib/episodes/assembly/persistence";
import {buildValidEpisodeTimeline} from "@/lib/episodes/assembly/__tests__/fixtures";
import {GET} from "../[assemblyId]/route";

const f=buildValidEpisodeTimeline();
const ids={seriesId:f.episodeTimeline.seriesId,assemblyId:f.episodeTimeline.id};
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"u"}},error:null})}} as any);
 vi.mocked(getEpisodeAssembly).mockResolvedValue({id:ids.assemblyId,series_id:ids.seriesId,episode_key:"episodeOne",status:"READY",version:1,timeline:f.episodeTimeline,preview:null} as any);
});
describe("GET Episode Assembly",()=>{
 it("returns owned timeline",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(200));
 it("hides provider and prompt internals",async()=>{const body=await (await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).json();const text=JSON.stringify(body);expect(text).not.toContain("provider_task_id");expect(text).not.toContain("promptChecksum");expect(text).not.toContain("claim_token");});
 it("returns 404 for foreign series path",async()=>expect((await GET(new NextRequest("http://x"),{params:Promise.resolve({...ids,seriesId:"other"})})).status).toBe(404));
 it("returns 401 unauthenticated",async()=>{vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}} as any);expect((await GET(new NextRequest("http://x"),{params:Promise.resolve(ids)})).status).toBe(401);});
});
