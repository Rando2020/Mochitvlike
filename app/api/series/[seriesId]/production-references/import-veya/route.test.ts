import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { listProductionReferenceRecords } from "@/lib/production-references/persistence";
import { createProductionReference } from "@/lib/production-references/service";
import { fetchPinnedVeyaSource, VEYA_SERIES_ID, VEYA_SOURCE_SHA256 } from "@/lib/production-references/veya-repo-source";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock("@/lib/series/persistence/getSeries", () => ({ getSeries: vi.fn() }));
vi.mock("@/lib/production-frames/persistence", () => ({ getPerformanceBibles: vi.fn(async () => []) }));
vi.mock("@/lib/production-references/persistence", () => ({ listProductionReferenceRecords: vi.fn() }));
vi.mock("@/lib/production-references/service", () => ({ createProductionReference: vi.fn() }));
vi.mock("@/lib/production-references/veya-repo-source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/production-references/veya-repo-source")>()),
  fetchPinnedVeyaSource: vi.fn()
}));
const userId="11111111-1111-4111-8111-111111111111";
const req=(origin="http://localhost")=>new NextRequest(`http://localhost/api/series/${VEYA_SERIES_ID}/production-references/import-veya`,{
  method:"POST",headers:{origin}
});
const call=(seriesId=VEYA_SERIES_ID,origin="http://localhost")=>POST(req(origin),{params:Promise.resolve({seriesId})});
const show={...theWoundsWeKeep,cast:[{...theWoundsWeKeep.cast[0],id:"char_veya"}]};
beforeEach(()=>{
  vi.resetAllMocks();
  vi.mocked(createServerSupabaseClient).mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:userId}},error:null})}} as never);
  vi.mocked(createAdminSupabaseClient).mockReturnValue({} as never);
  vi.mocked(getSeries).mockResolvedValue({id:VEYA_SERIES_ID,blueprint:show} as never);
  vi.mocked(listProductionReferenceRecords).mockResolvedValue([]);
  vi.mocked(fetchPinnedVeyaSource).mockResolvedValue(new Uint8Array([137,80,78,71]));
  vi.mocked(createProductionReference).mockResolvedValue({id:"ref1",status:"UPLOADED",checksum:VEYA_SOURCE_SHA256,width:1448,height:1086,mimeType:"image/png"});
});
describe("pinned Veya source import",()=>{
  it("creates an owner-scoped synthetic OTHER reference with rights unknown",async()=>{
    const res=await call();
    expect(res.status).toBe(201);
    const args=vi.mocked(createProductionReference).mock.calls[0][0];
    expect(args.userId).toBe(userId);
    expect(args.seriesId).toBe(VEYA_SERIES_ID);
    expect(args.metadata).toMatchObject({
      source:"SYNTHETIC",type:"CHARACTER",characterId:"char_veya",referenceRole:"OTHER",
      provenance:{creatorNameOrId:null,licenseIdOrDescription:null,projectSpecific:null,
        permissions:{productionUse:null,commercialUse:null,modelConditioning:null,redistribution:null}}
    });
    expect(args.metadata.benchmarkOnly).toBe(false);
  });
  it("does not fetch or upload when the identical original already exists",async()=>{
    vi.mocked(listProductionReferenceRecords).mockResolvedValue([{
      id:"existing",type:"CHARACTER",characterId:"char_veya",referenceRole:"OTHER",
      checksum:VEYA_SOURCE_SHA256,status:"UPLOADED"
    }] as never);
    const res=await call();
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyExists).toBe(true);
    expect(fetchPinnedVeyaSource).not.toHaveBeenCalled();
    expect(createProductionReference).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, unauthenticated and wrong-series requests before fetching",async()=>{
    expect((await call(VEYA_SERIES_ID,"https://evil.example")).status).toBe(403);
    expect((await call("22222222-2222-4222-8222-222222222222")).status).toBe(404);
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth:{getUser:async()=>({data:{user:null},error:null})}
    } as never);
    expect((await call()).status).toBe(401);
    expect(fetchPinnedVeyaSource).not.toHaveBeenCalled();
  });
  it("does not claim success after a failed remote fetch or persistence",async()=>{
    vi.mocked(fetchPinnedVeyaSource).mockRejectedValue(new Error("VEYA_SOURCE_CHECKSUM_MISMATCH"));
    let res=await call();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("VEYA_SOURCE_CHECKSUM_MISMATCH");
    vi.mocked(fetchPinnedVeyaSource).mockResolvedValue(new Uint8Array([137,80,78,71]));
    vi.mocked(createProductionReference).mockRejectedValue(new Error("private storage failure"));
    res=await call();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("VEYA_IMPORT_UNCONFIRMED");
  });
});
