import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { createSeriesRecord } from "../createSeries";
import { getSeries } from "../getSeries";
import { listSeries } from "../listSeries";
import { archiveSeriesRecord, updateSeriesRecord } from "../updateSeries";
import {
  validatePersistedSeriesBlueprint,
  validateSeriesBlueprintForWrite
} from "../validatePersistedSeries";
import { SeriesPersistenceError } from "../types";

const clone = () => structuredClone(theWoundsWeKeep);

function readClient(data: unknown, error: unknown = null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data, error })
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

function insertClient(data: unknown, capture: Record<string, unknown>) {
  return {
    from: () => ({
      insert: (value: Record<string, unknown>) => {
        Object.assign(capture, value);
        return {
          select: () => ({
            single: async () => ({ data, error: null })
          })
        };
      }
    })
  } as unknown as SupabaseClient;
}

function updateClient(data: unknown, capture: Record<string, unknown>) {
  const chain = {
    eq: () => chain,
    select: () => chain,
    maybeSingle: async () => ({ data, error: null })
  };
  return {
    from: () => ({
      update: (value: Record<string, unknown>) => {
        Object.assign(capture, value);
        return chain;
      }
    })
  } as unknown as SupabaseClient;
}

function listClient(rows: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: async () => ({ data: rows, error: null })
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

describe("Series persistence", () => {
  it("accepts a valid blueprint for writes", () => {
    expect(validateSeriesBlueprintForWrite(clone()).identity.title).toBe("The Wounds We Keep");
  });

  it("rejects structurally invalid blueprint writes", () => {
    const blueprint = clone();
    blueprint.identity.title = "";
    expect(() => validateSeriesBlueprintForWrite(blueprint)).toThrow(SeriesPersistenceError);
  });

  it("rejects cross-reference invariant failures", () => {
    const blueprint = clone();
    blueprint.relationships[0].toCharacterId = "missing";
    expect(() => validateSeriesBlueprintForWrite(blueprint)).toThrow(SeriesPersistenceError);
  });

  it("revalidates stored blueprints", () => {
    expect(validatePersistedSeriesBlueprint(clone()).episodeOne.beats).toHaveLength(5);
  });

  it("classifies corrupted stored data distinctly", () => {
    try {
      validatePersistedSeriesBlueprint({});
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toMatchObject({ code: "CORRUPT_STORED_SERIES" });
    }
  });

  it("persists server-owned creator identity and DRAFT status", async () => {
    const captured: Record<string, unknown> = {};
    const result = await createSeriesRecord(
      insertClient(
        {
          id: "series-1",
          title: "The Wounds We Keep",
          status: "DRAFT",
          created_at: "2026-09-28T00:00:00Z"
        },
        captured
      ),
      {
        creatorId: "user-1",
        seriesBlueprint: clone(),
        metadata: { source: "llm", schemaVersion: "1.0" }
      }
    );

    expect(captured.creator_id).toBe("user-1");
    expect(captured.status).toBe("DRAFT");
    expect(result.status).toBe("DRAFT");
  });

  it("reads an owned series and revalidates its blueprint", async () => {
    const series = await getSeries(
      readClient({
        id: "series-1",
        creator_id: "user-1",
        title: "The Wounds We Keep",
        slug: "the-wounds-we-keep",
        status: "DRAFT",
        blueprint: clone(),
        blueprint_schema_version: "1.0",
        generation_source: "llm",
        created_at: "2026-09-28T00:00:00Z",
        updated_at: "2026-09-28T00:00:00Z",
        archived_at: null
      }),
      "user-1",
      "series-1"
    );

    expect(series.blueprint.identity.title).toBe("The Wounds We Keep");
  });

  it("maps ownership-scoped misses to SERIES_NOT_FOUND", async () => {
    await expect(getSeries(readClient(null), "user-2", "series-1")).rejects.toMatchObject({
      code: "SERIES_NOT_FOUND"
    });
  });

  it("hides raw database failures behind a sanitized code", async () => {
    await expect(
      getSeries(readClient(null, { message: "sensitive SQL detail" }), "user-1", "series-1")
    ).rejects.toMatchObject({ code: "SERIES_PERSISTENCE_FAILED" });
  });

  it("updates titles without arbitrary blueprint mutation", async () => {
    const captured: Record<string, unknown> = {};
    await updateSeriesRecord(
      updateClient(
        {
          id: "series-1",
          title: "Renamed",
          status: "DRAFT",
          updated_at: "2026-09-28T01:00:00Z",
          archived_at: null
        },
        captured
      ),
      { creatorId: "user-1", seriesId: "series-1", title: "Renamed" }
    );

    expect(captured.title).toBe("Renamed");
    expect(captured).not.toHaveProperty("blueprint");
  });

  it("updates status", async () => {
    const captured: Record<string, unknown> = {};
    await updateSeriesRecord(
      updateClient(
        {
          id: "series-1",
          title: "Show",
          status: "ACTIVE",
          updated_at: "2026-09-28T01:00:00Z",
          archived_at: null
        },
        captured
      ),
      { creatorId: "user-1", seriesId: "series-1", status: "ACTIVE" }
    );

    expect(captured.status).toBe("ACTIVE");
    expect(captured.archived_at).toBeNull();
  });

  it("archives instead of hard deleting", async () => {
    const captured: Record<string, unknown> = {};
    await archiveSeriesRecord(
      updateClient(
        {
          id: "series-1",
          title: "Show",
          status: "ARCHIVED",
          updated_at: "2026-09-28T01:00:00Z",
          archived_at: "2026-09-28T01:00:00Z"
        },
        captured
      ),
      "user-1",
      "series-1"
    );

    expect(captured.status).toBe("ARCHIVED");
    expect(typeof captured.archived_at).toBe("string");
  });

  it("returns SERIES_NOT_FOUND when a foreign update matches no row", async () => {
    await expect(
      updateSeriesRecord(
        updateClient(null, {}),
        { creatorId: "foreign", seriesId: "series-1", title: "Hijack" }
      )
    ).rejects.toMatchObject({ code: "SERIES_NOT_FOUND" });
  });

  it("lists summaries without full blueprints", async () => {
    const result = await listSeries(
      listClient([
        {
          id: "series-1",
          title: "The Wounds We Keep",
          status: "DRAFT",
          blueprint: clone(),
          updated_at: "2026-09-28T02:00:00Z"
        }
      ]),
      "user-1"
    );

    expect(result[0].logline).toBe(theWoundsWeKeep.identity.logline);
    expect(result[0]).not.toHaveProperty("blueprint");
  });

  it("preserves updated_at descending result order", async () => {
    const first = clone();
    first.identity.title = "First";
    const second = clone();
    second.identity.title = "Second";

    const result = await listSeries(
      listClient([
        { id: "new", title: "First", status: "DRAFT", blueprint: first, updated_at: "2026-09-28T03:00:00Z" },
        { id: "old", title: "Second", status: "DRAFT", blueprint: second, updated_at: "2026-09-28T02:00:00Z" }
      ]),
      "user-1"
    );

    expect(result.map((item) => item.id)).toEqual(["new", "old"]);
  });
});
