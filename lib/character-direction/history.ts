import { z } from "zod";
import { CharacterDirectionSchema, type CharacterDirection } from "./schema";

const visualChanged = (a: CharacterDirection | null, b: CharacterDirection | null) =>
  (a?.body ?? null) !== (b?.body ?? null) || (a?.clothing ?? null) !== (b?.clothing ?? null);
const profileKey = (value: CharacterDirection | null) => JSON.stringify(value ? {
  ...value, personality: [...value.personality].sort()
} : { personality: [], body: null, clothing: null, voiceTexture: null, voiceDelivery: null, voicePace: null });

export const DirectionHistorySchema = z.array(z.object({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  previous: CharacterDirectionSchema.nullable(),
  direction: CharacterDirectionSchema.nullable(),
  savedAt: z.string().datetime(),
  visualChanged: z.boolean()
}).strict().refine(entry => entry.visualChanged === visualChanged(entry.previous, entry.direction), "Visual change marker must match direction."))
  .max(50).refine(entries => entries.every((entry, index) => index === 0 || profileKey(entry.previous) === profileKey(entries[index - 1].direction)), "Direction history must form a continuous chain.");
export type DirectionHistory = z.infer<typeof DirectionHistorySchema>;
