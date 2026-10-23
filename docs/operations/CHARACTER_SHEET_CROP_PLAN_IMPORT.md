# Character-sheet crop plan import (browser-first)

This is a safe convenience for the **existing** Production Reference Studio, not a bulk asset uploader, creative image generator, or auto-approval mechanism.

## Existing journey (reused)
1. Open a saved show, e.g. `/series/{seriesId}/references`, and choose the intended cast member.
2. Upload the **original complete reference sheet** under role `OTHER`, with truthful creator rights/provenance. Keep the uploaded original unchanged.
3. In **Import individual views from a sheet**, choose that `OTHER` source.
4. Click **Load crop plan (optional JSON)** and select the manifest supplied with your pack.
5. The importer rejects plans with the wrong show/character, source hash, source dimensions, malformed roles, or out-of-bounds rectangles.
6. Pick **Crop plan view** to prefill label, existing role, and pixel coordinates.
7. Click **Preview crop**; inspect the actual extracted pixels, not the composited overview.
8. Explicitly check the inspection box, then click **Save view for review**. Repeat as needed. Saved references remain `UPLOADED` or `REVIEW_REQUIRED`; **no approval** is inferred.

No background requests, paid inference, source upload, approval, or database modification occur when loading or switching a plan.

## JSON contract

```json
{
  "format": "crayvo-sheet-crop-plan-v1",
  "seriesId": "70bb0b5c-1ee1-4c0a-8e41-4a62bcf9c892",
  "characterId": "char_veya",
  "source": {
    "sha256": "<sha256 of exact original uploaded source bytes>",
    "width": 1448,
    "height": 1086
  },
  "views": [{
    "file": "assets/front.png",
    "label": "Front full body",
    "referenceRole": "FULL_BODY",
    "crop": { "left": 394, "top": 40, "width": 133, "height": 407 },
    "note": "Inspect outfit and halo before approving"
  }]
}
```

The parser consumes only crop fields. Additional metadata such as rights review notes stays client-only and does not become a trusted reference record. The server still checks the live creator-owned source, checksum, character revision, bounds, and approved reference lifecycle on each explicit save.

## Roles (canonical values)

The app accepts `FULL_BODY`, `PROFILE`, `EXPRESSION`, `COSTUME`, and `TURNAROUND` for individual imported views. Names such as `FULL_BODY_FRONT`, `FULL_BODY_34`, `FACE_CLOSEUP`, or `PALETTE_REFERENCE` are human-facing labels, **not supported role enums**.

`PRIMARY_IDENTITY` is a special canonical role, not a client-side crop-plan option. Review full-body or turnaround candidates for the current character revision using the existing **Review identity reference** action. Any eventual production reference approval remains an explicit creator action after a rights/provenance and quality check.

## Fidelity and permissions

Composite character-sheet crops are often small and can include embedded labels. They are **evidence candidates**, not isolated high-resolution masters or transparent parts. Do not synthesize detail via upscaling and claim those pixels are source fidelity. Create clean, high-resolution controlled images in a later approved step, preserving the composite as the original source.

For synthetic artwork, choose `SYNTHETIC`, record its project-specific origin, and **explicitly declare** commercial production and model-conditioning rights only after reviewing applicable terms and provenance. The import plan never supplies those legal declarations or approves anything.

## Safety and validation

- Client plan file limit: 64 KiB.
- Max 40 views per plan; max 80 characters per label.
- The source UUID is not accepted from JSON; the user chooses a source already returned for the currently signed-in creator's series.
- Source SHA-256 and width/height must exactly match.
- Every crop is bounded; duplicate file entries are rejected.
- Plan view switches invalidate prior previews, preventing accidental save of stale geometry.
- Existing server enforces source revision, creator ownership, pixel extraction, bounded output, and explicit per-view save; uncertainty stops automatic retry.

No production data migration is needed. Tests validate the JSON boundary, source mismatch, UI no-network load, and manual per-view preview.
