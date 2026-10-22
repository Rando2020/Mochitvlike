import { z } from "zod";

export const CropRectangleSchema = z.object({
  left: z.number().int().min(0), top: z.number().int().min(0),
  width: z.number().int().min(16).max(4096), height: z.number().int().min(16).max(4096)
}).strict();
export const SheetViewRequestSchema = z.object({
  action: z.enum(["preview", "save"]),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  crop: CropRectangleSchema,
  label: z.string().trim().min(1).max(80),
  referenceRole: z.enum(["FULL_BODY", "PROFILE", "EXPRESSION", "COSTUME", "TURNAROUND"]),
  expectedVisualRevision: z.string().regex(/^[a-f0-9]{64}$/).optional()
}).strict().refine(r => r.action !== "save" || !!r.expectedVisualRevision, "Preview before saving.");
export type SheetViewRequest = z.infer<typeof SheetViewRequestSchema>;
export const SheetViewLineageSchema = z.object({
  kind: z.literal("sheet-view-v1"), sourceReferenceId: z.string().uuid(),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/), sourceVersion: z.number().int().positive(),
  sourceWidth: z.number().int().positive(), sourceHeight: z.number().int().positive(),
  visualRevisionAtImport: z.string().regex(/^[a-f0-9]{64}$/), label: z.string().min(1).max(80),
  crop: CropRectangleSchema
}).strict();
export function readSheetViewLineage(notes: string | null) {
  try { const value = SheetViewLineageSchema.safeParse(JSON.parse(notes ?? "")); return value.success ? value.data : null; }
  catch { return null; }
}
