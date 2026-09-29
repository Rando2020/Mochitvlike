import { z } from "zod";

const id = z.string().trim().min(1).max(100);
const text = z.string().trim().min(1).max(2000);

export const VisualPlanSchema = z.object({
  id: z.string().uuid(),
  seriesId: z.string().uuid(),
  sceneId: z.string().uuid(),
  scriptId: z.string().uuid(),
  version: z.number().int().min(1),
  identity: z.object({
    title: z.string().trim().min(1).max(160)
  }).strict(),
  visualIntent: z.object({
    sceneObjective: text,
    emotionalArc: text,
    visualThesis: text,
    pacingIntent: text
  }).strict(),
  continuity: z.object({
    locationId: id.nullable(),
    characters: z.array(z.object({
      characterId: id,
      requiredAppearanceNotes: z.array(text).max(10),
      emotionalStart: text,
      emotionalEnd: text,
      continuityNotes: z.array(text).max(10)
    }).strict()).max(8),
    environmentRules: z.array(text).max(20),
    powerSystemRules: z.array(text).max(20),
    protectedCanon: z.array(text).max(30)
  }).strict(),
  staging: z.object({
    geography: text,
    characterPositions: z.array(z.object({
      characterId: id,
      initialPosition: text,
      movementIntent: text
    }).strict()).max(8),
    importantProps: z.array(text).max(20),
    interactionZones: z.array(text).max(20)
  }).strict(),
  visualBeats: z.array(z.object({
    id,
    sourceScriptBlockIds: z.array(id).min(1).max(20),
    purpose: text,
    storyMoment: text,
    emotionalFunction: text,
    staging: text,
    compositionIntent: text,
    focalCharacterIds: z.array(id).max(8),
    supportingCharacterIds: z.array(id).max(8),
    environmentFocus: z.string().trim().min(1).max(500).nullable(),
    motionIntent: z.enum(["STATIC", "SUBTLE", "ACTIVE", "CHAOTIC"]),
    transitionIntent: z.enum(["CONTINUE", "CUT", "HOLD", "REVEAL", "SHIFT"]),
    estimatedDurationSeconds: z.number().positive().max(120)
  }).strict()).min(1).max(40),
  continuityChecks: z.object({
    characterConsistency: z.array(text).max(20),
    environmentConsistency: z.array(text).max(20),
    protectedMysteries: z.array(id).max(20),
    forbiddenVisualContradictions: z.array(text).max(20)
  }).strict(),
  confidence: z.object({
    overall: z.number().min(0).max(1),
    assumptions: z.array(text).max(10)
  }).strict()
}).strict();
