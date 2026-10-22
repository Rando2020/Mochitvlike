import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { auth, owned, prepare, admin } = vi.hoisted(() => ({ auth: vi.fn(), owned: vi.fn(), prepare: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: auth } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: admin }));
vi.mock("@/lib/series/persistence/getSeries", () => ({ getSeries: owned }));
vi.mock("@/lib/production-references/sheet-view", () => ({ prepareSheetView: prepare, SheetViewError: class extends Error {} }));
import { POST } from "./route";
const body = { action: "preview", label: "Front", sourceChecksum: "a".repeat(64), referenceRole: "FULL_BODY",
  crop: { left: 0, top: 0, width: 128, height: 256 } };
const params = { params: Promise.resolve({ seriesId: "series", referenceId: "reference" }) };
const request = (payload: unknown = body) => new NextRequest("https://example.com/api/views", { method: "POST", body: JSON.stringify(payload) });
beforeEach(() => {
  vi.clearAllMocks(); auth.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  owned.mockResolvedValue({ status: "ACTIVE", blueprint: { cast: [] } }); admin.mockReturnValue({});
  prepare.mockResolvedValue({ previewUrl: "data:image/png;base64,AA==", visualRevision: "b".repeat(64) });
});
describe("sheet view API boundary", () => {
  it("requires a verified session before admin access", async () => {
    auth.mockResolvedValueOnce({ data: { user: null }, error: null });
    const result = await POST(request(), params); expect(result.status).toBe(401);
    expect(admin).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled();
  });
  it("denies another owner's show before any storage access", async () => {
    owned.mockRejectedValueOnce(new Error("SERIES_NOT_FOUND"));
    expect((await POST(request(), params)).status).toBe(404);
    expect(owned).toHaveBeenCalledWith(expect.anything(), "owner", "series"); expect(admin).not.toHaveBeenCalled();
  });
  it("rejects forged URLs, owner IDs and missing save revision", async () => {
    for (const payload of [{ ...body, ownerId: "other" }, { ...body, sourceUrl: "https://evil.invalid" }, { ...body, action: "save" }]) {
      expect((await POST(request(payload), params)).status).toBe(400);
    }
    expect(admin).not.toHaveBeenCalled();
  });
  it("blocks archived shows", async () => {
    owned.mockResolvedValueOnce({ status: "ARCHIVED" }); expect((await POST(request(), params)).status).toBe(409);
    expect(admin).not.toHaveBeenCalled();
  });
  it("returns private preview and 201 only for explicit save", async () => {
    const result = await POST(request(), params); expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(prepare.mock.calls[0][0]).toMatchObject({ userId: "owner", seriesId: "series", sourceId: "reference" });
    prepare.mockResolvedValueOnce({ reference: { id: "new" } });
    expect((await POST(request({ ...body, action: "save", expectedVisualRevision: "b".repeat(64) }), params)).status).toBe(201);
  });
  it("sanitizes unexpected failures and permits safe uncertain-save UI handling", async () => {
    prepare.mockRejectedValueOnce(new Error("private database or storage error"));
    const result = await POST(request(), params); expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("private database");
  });
});
