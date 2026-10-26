import { describe, expect, it, vi } from "vitest";
import { fetchPinnedVeyaSource } from "../veya-repo-source";
const png = new Uint8Array([137,80,78,71,13,10,26,10]);
describe("pinned repository source",()=>{
  it("never accepts bytes with a mismatched checksum",async()=>{
    const fetcher=vi.fn(async (_url: string, _init?: RequestInit)=>new Response(png,{status:200,headers:{"content-type":"image/png"}}));
    await expect(fetchPinnedVeyaSource(fetcher as typeof fetch)).rejects.toThrow("VEYA_SOURCE_CHECKSUM_MISMATCH");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toContain("/82cf5d2ec3211ee6af93afe8a99bc772e335d023/Crayvo_Veya_Source_Sheet.png");
  });
  it("rejects oversized and unavailable remote responses",async()=>{
    await expect(fetchPinnedVeyaSource(vi.fn(async()=>new Response(null,{status:404})) as typeof fetch))
      .rejects.toThrow("VEYA_SOURCE_FETCH_UNAVAILABLE");
    await expect(fetchPinnedVeyaSource(vi.fn(async()=>new Response(png,{status:200,headers:{"content-length":"11000000"}})) as typeof fetch))
      .rejects.toThrow("VEYA_SOURCE_TOO_LARGE");
  });
});
