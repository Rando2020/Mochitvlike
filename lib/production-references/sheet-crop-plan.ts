import { z } from "zod";
import { CropRectangleSchema } from "./sheet-view-schema";

// Pure client-side navigation aid. Uploading a plan never uploads, approves,
// saves, or generates any reference. The original source remains authoritative.
export const SheetCropPlanSchema = z.object({
  format: z.literal("crayvo-sheet-crop-plan-v1"),
  seriesId: z.string().uuid(),
  characterId: z.string().min(1).max(100),
  source: z.object({
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    width: z.number().int().min(1).max(4096),
    height: z.number().int().min(1).max(4096)
  }).passthrough(),
  views: z.array(z.object({
    file: z.string().min(1).max(200),
    label: z.string().trim().min(1).max(80),
    referenceRole: z.enum(["FULL_BODY", "PROFILE", "EXPRESSION", "COSTUME", "TURNAROUND"]),
    crop: CropRectangleSchema,
    note: z.string().max(1000).optional()
  }).passthrough()).min(1).max(40)
}).passthrough();

export type SheetCropPlan = z.infer<typeof SheetCropPlanSchema>;

export function checkSheetCropPlan(
  raw: unknown,
  scope: { seriesId: string; characterId: string; checksum: string; width: number; height: number }
): SheetCropPlan {
  const result = SheetCropPlanSchema.safeParse(raw);
  if (!result.success) throw new Error("INVALID_CROP_PLAN");
  const plan = result.data;
  if (plan.seriesId !== scope.seriesId || plan.characterId !== scope.characterId) {
    throw new Error("CROP_PLAN_WRONG_CHARACTER");
  }
  if (plan.source.sha256 !== scope.checksum ||
      plan.source.width !== scope.width || plan.source.height !== scope.height) {
    throw new Error("CROP_PLAN_SOURCE_MISMATCH");
  }
  if (plan.views.some(view => view.crop.left + view.crop.width > scope.width ||
     view.crop.top + view.crop.height > scope.height)) {
    throw new Error("CROP_PLAN_OUT_OF_BOUNDS");
  }
  if (new Set(plan.views.map(view => view.file)).size !== plan.views.length) {
    throw new Error("CROP_PLAN_DUPLICATE_VIEW");
  }
  return plan;
}
