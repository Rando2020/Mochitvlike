# Series Studio v1

## Purpose

The Series Studio is the first frontend consumer of the validated `SeriesBlueprint` produced by the Show Genesis Engine.

The UI treats the blueprint as authoritative series data. It does not expose JSON, prompt terminology, model configuration, or `characterSheetSeed` in the normal creator experience.

## Current route

`/series/[seriesId]`

Because this repository started empty and does not yet contain persistence for generated SeriesBlueprints, `/series/demo` uses `lib/series/demoBlueprint.ts` as a temporary data adapter.

Replace that adapter when series persistence/read APIs land. The `SeriesStudio` component itself already accepts a validated `SeriesBlueprint` and does not depend on the demo fixture.

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

The next backend/data task should provide a durable way to resolve a `seriesId` into a validated `SeriesBlueprint`.

After that, the next product capability should be Episode/Scene development state, not video rendering.
