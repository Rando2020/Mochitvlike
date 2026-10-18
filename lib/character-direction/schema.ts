import { z } from "zod";
import { DIRECTION_CATALOG } from "./catalog";
const ids = <T extends readonly { id: string }[]>(values: T) => values.map(item => item.id) as [T[number]["id"], ...T[number]["id"][]];
export const CharacterDirectionSchema = z.object({
  personality: z.array(z.enum(ids(DIRECTION_CATALOG.personality))).max(3).refine(values => new Set(values).size === values.length, "Choose distinct traits."),
  body: z.enum(ids(DIRECTION_CATALOG.body)).nullable(),
  clothing: z.enum(ids(DIRECTION_CATALOG.clothing)).nullable(),
  voiceTexture: z.enum(ids(DIRECTION_CATALOG.voiceTexture)).nullable(),
  voiceDelivery: z.enum(ids(DIRECTION_CATALOG.voiceDelivery)).nullable(),
  voicePace: z.enum(ids(DIRECTION_CATALOG.voicePace)).nullable()
}).strict();
export type CharacterDirection = z.infer<typeof CharacterDirectionSchema>;
export const EMPTY_CHARACTER_DIRECTION: CharacterDirection = { personality: [], body: null, clothing: null, voiceTexture: null, voiceDelivery: null, voicePace: null };
