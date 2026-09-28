import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { POST } from "../route";
import { GET as GET_ONE } from "../[seriesId]/route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn()
}));

const mockedCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

function unauthenticatedClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: null
      })
    }
  };
}

function createClient(userId = "user-1") {
  const insertResult = {
    data: {
      id: "11111111-1111-4111-8111-111111111111",
      title: "The Wounds We Keep",
      status: "DRAFT",
      created_at: "2026-09-28T00:00:00Z"
    },
    error: null
  };

  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: userId } },
        error: null
      })
    },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => insertResult
        })
      })
    })
  };
}

function readClient(data: unknown, userId = "user-1") {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data, error: null })
  };

  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: userId } },
        error: null
      })
    },
    from: () => chain
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/series", () => {
  it("returns 401 for unauthenticated create", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      unauthenticatedClient() as never
    );

    const response = await POST(
      new NextRequest("http://localhost/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesBlueprint: theWoundsWeKeep,
          metadata: { source: "llm", schemaVersion: "1.0" }
        })
      })
    );

    expect(response.status).toBe(401);
  });

  it("creates an authenticated series", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      createClient() as never
    );

    const response = await POST(
      new NextRequest("http://localhost/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesBlueprint: theWoundsWeKeep,
          metadata: { source: "llm", schemaVersion: "1.0" }
        })
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.series.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("rejects creatorId spoofing because the public payload is strict", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      createClient() as never
    );

    const response = await POST(
      new NextRequest("http://localhost/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: "attacker",
          seriesBlueprint: theWoundsWeKeep,
          metadata: { source: "llm", schemaVersion: "1.0" }
        })
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects an invalid blueprint before persistence", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      createClient() as never
    );

    const response = await POST(
      new NextRequest("http://localhost/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesBlueprint: {},
          metadata: { source: "llm", schemaVersion: "1.0" }
        })
      })
    );

    expect(response.status).toBe(400);
  });
});

describe("GET /api/series/[seriesId]", () => {
  it("returns the same 404 for an unknown owned scope", async () => {
    mockedCreateServerSupabaseClient.mockResolvedValue(
      readClient(null) as never
    );

    const response = await GET_ONE(
      new NextRequest("http://localhost/api/series/11111111-1111-4111-8111-111111111111"),
      {
        params: Promise.resolve({
          seriesId: "11111111-1111-4111-8111-111111111111"
        })
      }
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 for invalid identifiers without querying ownership", async () => {
    const response = await GET_ONE(
      new NextRequest("http://localhost/api/series/not-a-uuid"),
      {
        params: Promise.resolve({
          seriesId: "not-a-uuid"
        })
      }
    );

    expect(response.status).toBe(404);
  });
});
