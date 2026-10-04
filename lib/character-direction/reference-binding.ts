import { createHash } from "node:crypto";
import { z } from "zod";
import type { CastMember } from "@/lib/series/types";

export const BindingReferenceRoleSchema = z.enum(["PRIMARY_IDENTITY", "FULL_BODY", "TURNAROUND"]);
export const ReferenceBindingHistorySchema = z.array(z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  visualRevision: z.string().regex(/^[a-f0-9]{64}$/),
  referenceId: z.string().uuid(),
  referenceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  referenceVersion: z.number().int().positive(),
  sourceRole: BindingReferenceRoleSchema,
  approvedBy: z.string().uuid(),
  approvedAt: z.string().datetime()
}).strict()).max(50).refine(entries => new Set(entries.map(entry => entry.id)).size === entries.length, "Binding receipts must be unique.");
export type ReferenceBindingHistory = z.infer<typeof ReferenceBindingHistorySchema>;

// Non-visual edits must not invalidate identity approval. A visual edit or a
// changed canonical appearance does, even when tags are reverted to older values.
export function characterVisualRevision(member: CastMember) {
  const lastVisualEdit = member.generationDirectionHistory?.findLast(entry => entry.visualChanged)?.revision ?? null;
  return createHash("sha256").update(JSON.stringify([
    member.id, member.visualConcept, member.characterSheetSeed.visualDescription,
    member.generationDirection?.body ?? null, member.generationDirection?.clothing ?? null, lastVisualEdit
  ])).digest("hex");
}
export function currentReferenceBinding(member: CastMember) {
  const latest = member.referenceBindingHistory?.at(-1);
  return latest?.visualRevision === characterVisualRevision(member) ? latest : null;
}
