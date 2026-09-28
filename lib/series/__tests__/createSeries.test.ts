import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeriesAndEnter, persistGeneratedSeries } from "../createSeries";
import { theWoundsWeKeep } from "../demoBlueprint";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generate → persist → Studio orchestration", () => {
  it("persists a generated SeriesBlueprint through POST /api/series", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          series: {
            id: "11111111-1111-4111-8111-111111111111",
            title: "The Wounds We Keep",
            status: "DRAFT",
            createdAt: "2026-09-28T00:00:00Z"
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    await persistGeneratedSeries({
      seriesBlueprint: theWoundsWeKeep,
      metadata: { source: "llm", schemaVersion: "1.0" }
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/series",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not send creatorId from the browser helper", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          series: {
            id: "11111111-1111-4111-8111-111111111111",
            title: "The Wounds We Keep",
            status: "DRAFT",
            createdAt: "2026-09-28T00:00:00Z"
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    await persistGeneratedSeries({
      seriesBlueprint: theWoundsWeKeep,
      metadata: { source: "llm", schemaVersion: "1.0" }
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(String(options?.body)).not.toContain("creatorId");
  });

  it("routes into the persisted Studio after a successful save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          series: {
            id: "11111111-1111-4111-8111-111111111111",
            title: "The Wounds We Keep",
            status: "DRAFT",
            createdAt: "2026-09-28T00:00:00Z"
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    const router = { push: vi.fn() };

    await createSeriesAndEnter(router, {
      seriesBlueprint: theWoundsWeKeep,
      metadata: { source: "llm", schemaVersion: "1.0" }
    });

    expect(router.push).toHaveBeenCalledWith(
      "/series/11111111-1111-4111-8111-111111111111"
    );
  });

  it("does not route when persistence fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "SERIES_PERSISTENCE_FAILED" } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    );

    const router = { push: vi.fn() };

    await expect(
      createSeriesAndEnter(router, {
        seriesBlueprint: theWoundsWeKeep,
        metadata: { source: "llm", schemaVersion: "1.0" }
      })
    ).rejects.toThrow("SERIES_PERSISTENCE_FAILED");

    expect(router.push).not.toHaveBeenCalled();
  });

  it("keeps the Series Studio route UUID-based rather than title-based", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          series: {
            id: "22222222-2222-4222-8222-222222222222",
            title: "A Totally Different Title",
            status: "DRAFT",
            createdAt: "2026-09-28T00:00:00Z"
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    const router = { push: vi.fn() };

    await createSeriesAndEnter(router, {
      seriesBlueprint: theWoundsWeKeep,
      metadata: { source: "llm", schemaVersion: "1.0" }
    });

    expect(router.push).toHaveBeenCalledWith(
      "/series/22222222-2222-4222-8222-222222222222"
    );
  });
});
