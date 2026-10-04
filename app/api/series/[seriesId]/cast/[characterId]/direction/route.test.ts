import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { EMPTY_CHARACTER_DIRECTION } from "@/lib/character-direction/schema";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), edit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => ({ auth: { getUser: mocks.auth } }) }));
vi.mock("@/lib/character-direction/edit", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/character-direction/edit")>(), editCharacterDirection: mocks.edit }));
const context = { params: Promise.resolve({ seriesId: "show", characterId: "char_mara" }) };
const request = (body: unknown) => new NextRequest("http://localhost/api/series/show/cast/char_mara/direction", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id: "owner" } }, error: null }); mocks.edit.mockResolvedValue({ review: {} }); });
describe("Direction API authentication and validation", () => {
  it("requires a verified session", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request({ action: "review", direction: EMPTY_CHARACTER_DIRECTION }), context)).status).toBe(401); expect(mocks.edit).not.toHaveBeenCalled();
  });
  it("rejects invalid tags and client-supplied ownership", async () => {
    expect((await POST(request({ action: "review", direction: EMPTY_CHARACTER_DIRECTION, creatorId: "other" }), context)).status).toBe(400);
    expect((await POST(request({ action: "save", direction: EMPTY_CHARACTER_DIRECTION }), context)).status).toBe(400); expect(mocks.edit).not.toHaveBeenCalled();
  });
  it("uses session ownership and forbids caching", async () => {
    const response = await POST(request({ action: "review", direction: EMPTY_CHARACTER_DIRECTION }), context);
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.edit.mock.calls[0].slice(1, 4)).toEqual(["owner", "show", "char_mara"]);
  });
});
