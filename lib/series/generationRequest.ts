import { z } from "zod";
import { CharacterDirectionSchema } from "@/lib/character-direction/schema";

export const SeriesIdeaRequestSchema = z.object({
  idea: z.string().trim().min(3).max(5000),
  protagonistDirection: CharacterDirectionSchema.optional(),
  preferences: z.object({
    episodeLengthSeconds: z.number().int().min(30).max(120).optional(),
    targetEpisodeCount: z.number().int().min(8).max(20).optional()
  }).strict().optional()
}).strict();
export type SeriesIdeaRequest = z.infer<typeof SeriesIdeaRequestSchema>;
