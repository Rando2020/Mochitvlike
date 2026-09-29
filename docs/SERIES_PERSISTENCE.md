# Series Persistence

## Purpose

This layer makes a generated show durable without changing the `SeriesBlueprint` contract or the Series Studio presentation.

```text
Show Genesis
    ↓
validated SeriesBlueprint
    ↓
series.blueprint JSONB
    ↓
authenticated retrieval
    ↓
runtime revalidation
    ↓
Series Studio
```

## Why JSONB for MVP

The blueprint is generated and validated as one coherent creative document. Storing that document atomically in `series.blueprint` keeps the persistence model aligned with the product model while the schema is still evolving.

Normalizing cast, relationships, world rules, canon facts, episode beats, and creative DNA into separate tables now would:

- multiply migration surface before those subdomains have independent write workflows;
- create complex transactional synchronization between tables and the canonical generated blueprint;
- make schema iteration slower while the Show Genesis contract is still young.

Relational columns are used for concerns that already need independent querying or authorization:

- ownership;
- status;
- title;
- schema version;
- generation source;
- timestamps.

Normalize a blueprint subdomain later when it gains independent lifecycle, querying, collaboration, or high-volume mutation requirements.

## Security

RLS is enabled on `public.series`.

Authenticated users may select, insert, update, or delete only rows where:

```sql
creator_id = auth.uid()
```

Public API routes also scope queries to the authenticated user. Unknown series and series owned by another user both return 404.

## Validation

Blueprint JSON is validated twice:

1. before insertion;
2. after retrieval, before it can reach `SeriesStudio`.

The database containing JSONB does not make that JSON trustworthy. Corrupted or legacy-invalid rows fail with `CORRUPT_STORED_SERIES`.

## API

### POST /api/series

Persists a validated generated blueprint.

### GET /api/series

Returns lightweight current-user series summaries. Full blueprints are intentionally omitted.

### GET /api/series/[seriesId]

Returns one owned, revalidated series.

### PATCH /api/series/[seriesId]

Supports only bounded title/status changes.

### DELETE /api/series/[seriesId]

Archives the show by setting:

```text
status = ARCHIVED
archived_at = now()
```

It does not hard-delete data.

## Routing

Production routes use UUID IDs:

```text
/series/<uuid>
```

Title/slug changes do not affect routing.

`/series/demo` remains available only outside production and never acts as a fallback for failed persisted-series reads.

## Next seam

The next product slice should introduce durable Episode/Scene development state. Do not normalize the full blueprint merely to support that. Add scene-specific data around the blueprint and define explicit canon mutations when scene development is implemented.
