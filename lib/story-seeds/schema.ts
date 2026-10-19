import { z } from "zod";
import type { SeriesBlueprint } from "@/lib/series/types";

export const StorySeedSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  type: z.enum(["EVENT", "REVEAL", "RELATIONSHIP", "ENDING"]),
  placement: z.enum(["OPENING", "MIDPOINT", "FINALE", "UNPLACED"]),
  characterId: z.string().min(1).max(160),
  locked: z.boolean(),
  setup: z.string().max(600),
  consequence: z.string().max(600),
  payoff: z.string().max(600)
}).strict();

export const StoryPlanSaveSchema = z.object({
  requestId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  acknowledgeLockedChanges: z.boolean(),
  seeds: z.array(StorySeedSchema).max(60)
}).strict();

export type StorySeed = z.infer<typeof StorySeedSchema>;
export type StoryPlan = { revision: number; seeds: StorySeed[]; updatedAt: string | null };
export type StoryPlanSaveInput = z.infer<typeof StoryPlanSaveSchema>;

export function validateStorySeeds(
  seeds: unknown,
  blueprint: SeriesBlueprint
): StorySeed[] {
  const parsed = z.array(StorySeedSchema).max(60).parse(seeds);
  const ids = new Set<string>();
  const cast = new Set(blueprint.cast.map((member) => member.id));
  for (const seed of parsed) {
    if (ids.has(seed.id) || !cast.has(seed.characterId)) {
      throw new Error("STORY_SEED_INVALID_ASSOCIATION");
    }
    ids.add(seed.id);
  }
  return parsed;
}

export function lockedSeedChanges(existing: StorySeed[], proposed: StorySeed[]): boolean {
  return existing.some((previous) => previous.locked &&
    !proposed.some((current) => current.id === previous.id &&
      JSON.stringify(current) === JSON.stringify(previous)));
}
