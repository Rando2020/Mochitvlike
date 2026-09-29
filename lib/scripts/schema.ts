import { z } from "zod";

const id = z.string().trim().min(1).max(100);
const text = z.string().trim().min(1).max(2000);

const ActionBlock = z.object({
  id,
  type: z.literal("ACTION"),
  text
}).strict();

const DialogueBlock = z.object({
  id,
  type: z.literal("DIALOGUE"),
  characterId: id,
  text,
  deliveryIntent: z.string().trim().min(1).max(300).nullable()
}).strict();

const ReactionBlock = z.object({
  id,
  type: z.literal("REACTION"),
  characterId: id,
  text
}).strict();

const PauseBlock = z.object({
  id,
  type: z.literal("PAUSE"),
  durationHint: z.enum(["SHORT", "MEDIUM", "LONG"]),
  purpose: text
}).strict();

export const SceneScriptSchema = z.object({
  id: z.string().uuid(),
  sceneId: z.string().uuid(),
  seriesId: z.string().uuid(),
  version: z.number().int().min(1),
  identity: z.object({
    title: z.string().trim().min(1).max(160)
  }).strict(),
  estimatedDurationSeconds: z.number().int().min(5).max(120),
  blocks: z.array(z.discriminatedUnion("type", [
    ActionBlock,
    DialogueBlock,
    ReactionBlock,
    PauseBlock
  ])).min(1).max(80),
  endingStateVerification: z.object({
    requiredStoryChangeAchieved: z.boolean(),
    explanation: text
  }).strict(),
  continuityVerification: z.object({
    requiredCanonFactIdsUsed: z.array(id).max(30),
    protectedMysteriesPreserved: z.array(id).max(20),
    contradictionsDetected: z.array(text).max(20)
  }).strict(),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    assumptions: z.array(text).max(10)
  }).strict()
}).strict();
