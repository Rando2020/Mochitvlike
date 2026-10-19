import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeriesBlueprint } from "@/lib/series/types";
import { characterVisualRevision } from "@/lib/character-direction/reference-binding";
import { getProductionReferenceRecord } from "./persistence";
import { createProductionReference } from "./service";
import { inspectProductionReferenceImage, MAX_PRODUCTION_REFERENCE_BYTES, referenceChecksum } from "./image";
import { SheetViewRequestSchema, type SheetViewRequest } from "./sheet-view-schema";

export class SheetViewError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function extractSheetView(bytes: Uint8Array, mime: string, crop: SheetViewRequest["crop"]) {
  const source = inspectProductionReferenceImage(bytes, mime);
  if (source.width * source.height > 16_777_216 || crop.left + crop.width > source.width || crop.top + crop.height > source.height) {
    throw new SheetViewError(400, "SHEET_CROP_OUT_OF_BOUNDS");
  }
  try {
    const image = sharp(Buffer.from(bytes), { limitInputPixels: 16_777_216, animated: false });
    const metadata = await image.metadata();
    if ((metadata.pages ?? 1) !== 1 || (metadata.orientation ?? 1) !== 1) throw new Error("Normalize image orientation first.");
    const result = await image.extract(crop).png().toBuffer();
    if (result.length > MAX_PRODUCTION_REFERENCE_BYTES) throw new Error("Output too large.");
    return result;
  } catch { throw new SheetViewError(400, "SHEET_IMAGE_REQUIRES_STATIC_NORMALIZED_INPUT"); }
}

export async function prepareSheetView(input: {
  admin: SupabaseClient; userId: string; seriesId: string; sourceId: string;
  series: SeriesBlueprint; request: SheetViewRequest;
}) {
  const request = SheetViewRequestSchema.parse(input.request);
  const source = await getProductionReferenceRecord(input.admin, input.userId, input.seriesId, input.sourceId);
  const member = input.series.cast.find(c => c.id === source.characterId);
  if (!member || source.type !== "CHARACTER" || source.referenceRole !== "OTHER" || source.benchmarkOnly ||
      ["ARCHIVED", "REJECTED"].includes(source.status)) throw new SheetViewError(409, "SHEET_SOURCE_NOT_ELIGIBLE");
  if (source.checksum !== request.sourceChecksum) throw new SheetViewError(409, "SHEET_SOURCE_CHANGED");
  const revision = characterVisualRevision(member);
  if (request.action === "save" && request.expectedVisualRevision !== revision) throw new SheetViewError(409, "CHARACTER_CHANGED_PREVIEW_AGAIN");
  // Read private storage only through the verified owner's canonical path.
  if (!source.storagePath.startsWith(`users/${input.userId}/series/${input.seriesId}/references/${source.id}/`)) throw new SheetViewError(404, "SHEET_SOURCE_NOT_FOUND");
  const { data, error } = await input.admin.storage.from("production-references").download(source.storagePath);
  if (error || !data || data.size > MAX_PRODUCTION_REFERENCE_BYTES) throw new SheetViewError(503, "SHEET_SOURCE_UNAVAILABLE");
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (referenceChecksum(bytes) !== source.checksum) throw new SheetViewError(409, "SHEET_SOURCE_CHANGED");
  const inspection = inspectProductionReferenceImage(bytes, source.visualMetadata.mimeType);
  if (inspection.width !== source.visualMetadata.width || inspection.height !== source.visualMetadata.height) throw new SheetViewError(409, "SHEET_SOURCE_CHANGED");
  const cropped = await extractSheetView(bytes, inspection.mimeType, request.crop);
  if (request.action === "preview") return {
    previewUrl: `data:image/png;base64,${cropped.toString("base64")}`, visualRevision: revision,
    width: request.crop.width, height: request.crop.height
  };
  const notes = JSON.stringify({ kind: "sheet-view-v1", sourceReferenceId: source.id, sourceChecksum: source.checksum,
    sourceVersion: source.version, sourceWidth: inspection.width, sourceHeight: inspection.height,
    visualRevisionAtImport: revision, label: request.label, crop: request.crop });
  const reference = await createProductionReference({ ...input, performanceBibles: [],
    file: { bytes: cropped, mimeType: "image/png" }, metadata: {
      type: "CHARACTER", characterId: member.id, referenceRole: request.referenceRole,
      source: source.source, provenance: structuredClone(source.provenance), modelCompatibility: [...source.modelCompatibility], notes
    }
  });
  return { reference };
}
