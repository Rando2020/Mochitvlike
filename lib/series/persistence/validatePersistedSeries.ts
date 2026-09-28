import { SeriesBlueprintSchema } from "@/lib/series/schema";
import type { SeriesBlueprint } from "@/lib/series/types";
import { hasValidSeriesBlueprintInvariants } from "./validateBlueprintInvariants";
import { SeriesPersistenceError } from "./types";

function parse(input: unknown, code: "CORRUPT_STORED_SERIES" | "INVALID_SERIES_BLUEPRINT") {
  const result = SeriesBlueprintSchema.safeParse(input);

  if (!result.success) {
    throw new SeriesPersistenceError(
      code,
      code === "CORRUPT_STORED_SERIES"
        ? "Stored series blueprint failed runtime validation."
        : "Series blueprint failed runtime validation."
    );
  }

  const blueprint = result.data as SeriesBlueprint;

  if (!hasValidSeriesBlueprintInvariants(blueprint)) {
    throw new SeriesPersistenceError(
      code,
      code === "CORRUPT_STORED_SERIES"
        ? "Stored series blueprint violated runtime invariants."
        : "Series blueprint violated runtime invariants."
    );
  }

  return blueprint;
}

export function validatePersistedSeriesBlueprint(input: unknown): SeriesBlueprint {
  return parse(input, "CORRUPT_STORED_SERIES");
}

export function validateSeriesBlueprintForWrite(input: unknown): SeriesBlueprint {
  return parse(input, "INVALID_SERIES_BLUEPRINT");
}
