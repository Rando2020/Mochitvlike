# Series Studio v1

## Purpose

The Series Studio is the first frontend consumer of the validated `SeriesBlueprint` produced by the Show Genesis Engine.

The UI treats the blueprint as authoritative series data. It does not expose JSON, prompt terminology, model configuration, or `characterSheetSeed` in the normal creator experience.

## Route

`/series/[seriesId]`

The production route now resolves an authenticated UUID-backed series through the persistence layer, revalidates its stored blueprint, and passes that validated object into `SeriesStudio`.

`/series/demo` remains an explicit development-only fixture. Production series never silently fall back to demo data.

See `docs/SERIES_PERSISTENCE.md` for the durable storage and authorization contract.

## Product hierarchy

1. Series identity
2. Episode 1 and its beats
3. Cast
4. Story status
5. Blueprint-selected specialized tools
6. Creative DNA / World / Canon details on demand

## Polymorphic tools

`studioFeatures` is the only source of truth for specialized Studio modules.

`components/series-studio/studioFeatureRegistry.tsx` maps known feature IDs to human-facing labels and React panels. Do not introduce genre-specific rendering branches.

## Next integration seam

The next product capability should add durable Episode/Scene development state around the persisted series.

Do not jump directly to video rendering. Scene development should establish purpose, cast, location, dialogue/action intent, ending state, and explicit canon changes first.
