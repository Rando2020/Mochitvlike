import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSeriesBlueprint, SeriesGenerationError } from "@/lib/series/generateSeriesBlueprint";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { POST } from "../route";
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:vi.fn()}));
vi.mock("@/lib/series/generateSeriesBlueprint",async original=>({...await original<object>(),generateSeriesBlueprint:vi.fn()}));
const request=(body:unknown)=>new NextRequest("http://localhost/api/series/generate",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"owner"}},error:null})}} as never);});
describe("authenticated show generation route",()=>{
  it("requires an authenticated creator before provider execution",async()=>{
    vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:null})}} as never);
    expect((await POST(request({idea:"A quiet mystery"}))).status).toBe(401);
    expect(generateSeriesBlueprint).not.toHaveBeenCalled();
  });
  it("rejects invalid bounds, client identity, and malformed JSON",async()=>{
    for(const body of [{idea:"x"},{idea:"x".repeat(5001)},{idea:"story",creatorId:"other"},{idea:"story",preferences:{targetEpisodeCount:21}}]) expect((await POST(request(body))).status).toBe(400);
    expect((await POST(new NextRequest("http://localhost/api/series/generate",{method:"POST",body:"{"}))).status).toBe(400);
    expect(generateSeriesBlueprint).not.toHaveBeenCalled();
  });
  it("returns a direction without persisting a series and prevents caching",async()=>{
    vi.mocked(generateSeriesBlueprint).mockResolvedValue({seriesBlueprint:theWoundsWeKeep,metadata:{source:"llm",schemaVersion:"1.0"}});
    const res=await POST(request({idea:"A healer with a price"}));
    expect(res.status).toBe(200);expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect((await res.json()).seriesBlueprint.identity.title).toBe(theWoundsWeKeep.identity.title);
  });
  it("returns a bounded provider-unavailable error",async()=>{
    vi.mocked(generateSeriesBlueprint).mockRejectedValue(new SeriesGenerationError("SERIES_PROVIDER_UNAVAILABLE"));
    const res=await POST(request({idea:"A quiet mystery"}));expect(res.status).toBe(503);
    expect(await res.json()).toEqual({error:{code:"SERIES_PROVIDER_UNAVAILABLE"}});
  });
});
