import { z } from "zod";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const beatId = z.string().min(1).max(100);
const unique = (items: string[]) => new Set(items).size === items.length;
export const SelectedBeatIdsSchema = z.array(beatId).max(8).refine(unique, "Duplicate beat IDs");
export const StoryAssistantRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  selectedBeatIds: SelectedBeatIdsSchema,
  expectedSnapshot: digest
}).strict();
export type StoryAssistantRequest = z.infer<typeof StoryAssistantRequestSchema>;

export const StorySnapshotSchema = z.object({
  seriesId: z.string().uuid(),
  blueprintUpdatedAt: z.iso.datetime({ offset: true }),
  blueprintDigest: digest,
  seedRevision: z.number().int().min(0),
  seedDigest: digest,
  digest
}).strict();
export type StorySnapshot = z.infer<typeof StorySnapshotSchema>;
export const StorySourceSchema = z.object({
  id: z.string().min(1).max(250),
  kind: z.enum(["canon", "planning", "creative", "character", "world", "creator-private"]),
  label: z.string().min(1).max(500),
  content: z.string().min(1).max(60000)
}).strict();
export const StoryContextSchema = z.object({
  snapshot: StorySnapshotSchema,
  sources: z.array(StorySourceSchema).max(180),
  selectedBeatIds: SelectedBeatIdsSchema,
  availableBeats: z.array(z.object({ id: beatId, summary: z.string().min(1).max(1200) }).strict()).max(8)
}).strict();
export type StoryContext = z.infer<typeof StoryContextSchema>;
export type StorySource = z.infer<typeof StorySourceSchema>;
export const StoryAssistantContextResponseSchema = z.object({
  context: StoryContextSchema,
  capability: z.object({ enabled: z.boolean(), reason: z.string().min(1).max(500) }).strict()
}).strict();
const prose = z.string().trim().min(1).max(1800);
const sourceIds = z.array(z.string().min(1).max(250)).min(1).max(12).refine(unique, "Duplicate source IDs");
export const StorySuggestionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  beat: prose,
  whyItFits: prose,
  setup: prose,
  consequences: prose,
  sourceIds,
  alternative: z.object({ beat: prose, tradeoff: prose, sourceIds }).strict()
}).strict();
export const StorySuggestionsSchema = z.array(StorySuggestionSchema).min(1).max(3);
export const StoryAssistantResultSchema = z.object({
  snapshot: StorySnapshotSchema,
  suggestions: StorySuggestionsSchema
}).strict();
export type StorySuggestion = z.infer<typeof StorySuggestionSchema>;
export type StoryAssistantResult = z.infer<typeof StoryAssistantResultSchema>;
