import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
const mocks=vi.hoisted(()=>({auth:vi.fn(),review:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:async()=>({auth:{getUser:mocks.auth}})}));
vi.mock("@/lib/character-direction/review-reference-binding",async importOriginal=>({...await importOriginal<typeof import("@/lib/character-direction/review-reference-binding")>(),reviewReferenceBinding:mocks.review}));
const context={params:Promise.resolve({seriesId:"show",characterId:"char_orin"})};
const request=(body:unknown)=>new NextRequest("http://localhost/api/series/show/cast/char_orin/reference-binding",{method:"POST",body:JSON.stringify(body)});
const body={action:"review",referenceId:"11111111-1111-4111-8111-111111111111"};
beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue({data:{user:{id:"owner"}},error:null});mocks.review.mockResolvedValue({review:{}});});
describe("Reference binding API",()=>{
 it("requires verified authentication before reading or writing",async()=>{mocks.auth.mockResolvedValue({data:{user:null},error:null});expect((await POST(request(body),context)).status).toBe(401);expect(mocks.review).not.toHaveBeenCalled();});
 it("rejects client ownership and missing reviewed approval fields",async()=>{expect((await POST(request({...body,approvedBy:"other"}),context)).status).toBe(400);expect((await POST(request({...body,action:"approve"}),context)).status).toBe(400);expect(mocks.review).not.toHaveBeenCalled();});
 it("uses session ownership and no-store responses",async()=>{const response=await POST(request(body),context);expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toContain("no-store");expect(mocks.review.mock.calls[0].slice(1,4)).toEqual(["owner","show","char_orin"]);});
});
