import { z } from "zod";

const id = z.string().trim().min(1).max(100);
const text = z.string().trim().min(1).max(1200);

export const SceneBlueprintSchema = z.object({
  id: z.string().uuid(),
  seriesId: z.string().uuid(),
  episodeKey: z.literal("episodeOne"),
  sourceBeatId: id,
  identity: z.object({
    title: z.string().trim().min(1).max(160),
    shortDescription: text
  }).strict(),
  storyPurpose: z.object({
    objective: text,
    requiredStoryChange: text,
    whyThisSceneExists: text
  }).strict(),
  openingState: z.object({
    summary: text,
    emotionalStateByCharacter: z.array(z.object({
      characterId: id,
      state: text
    }).strict()).max(6),
    knownFactsByCharacter: z.array(z.object({
      characterId: id,
      knownCanonFactIds: z.array(id).max(20),
      notes: z.array(text).max(10)
    }).strict()).max(6)
  }).strict(),
  cast: z.array(z.object({
    characterId: id,
    sceneRole: text,
    immediateWant: text,
    pressure: text
  }).strict()).min(1).max(6),
  location: z.object({
    locationId: id.nullable(),
    settingNotes: text
  }).strict(),
  dramaticStructure: z.object({
    entryBeat: text,
    escalation: text,
    turn: text,
    exitBeat: text
  }).strict(),
  dialogueIntent: z.array(z.object({
    characterId: id,
    objective: text,
    subtext: text,
    mustCommunicate: z.array(text).max(8),
    mustNotReveal: z.array(text).max(8)
  }).strict()).max(6),
  actionIntent: z.object({
    summary: text,
    requiredActions: z.array(text).max(10),
    optionalBusiness: z.array(text).max(10)
  }).strict(),
  emotionalTurn: z.object({
    from: text,
    to: text,
    trigger: text
  }).strict(),
  endingState: z.object({
    summary: text,
    characterChanges: z.array(z.object({
      characterId: id,
      change: text
    }).strict()).max(6),
    knowledgeChanges: z.array(z.object({
      characterId: id,
      learns: z.array(text).max(10)
    }).strict()).max(6),
    relationshipChanges: z.array(z.object({
      fromCharacterId: id,
      toCharacterId: id,
      change: text
    }).strict()).max(12)
  }).strict(),
  proposedCanonChanges: z.array(z.object({
    type: z.enum(["ADD_FACT","CHANGE_MUTABLE_FACT","RESOLVE_MYSTERY","ADD_MYSTERY"]),
    explanation: text,
    targetCanonId: id.nullable(),
    proposedValue: text
  }).strict()).max(10),
  continuityChecks: z.object({
    requiredCanonFactIds: z.array(id).max(20),
    forbiddenContradictions: z.array(text).max(20),
    unresolvedQuestionsProtected: z.array(text).max(10)
  }).strict(),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    assumptions: z.array(text).max(10)
  }).strict()
}).strict();

export type SceneBlueprintInput = z.input<typeof SceneBlueprintSchema>;
