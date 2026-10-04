import { z } from "zod";
import { CharacterDirectionSchema } from "@/lib/character-direction/schema";
import { DirectionHistorySchema } from "@/lib/character-direction/history";
import { ReferenceBindingHistorySchema } from "@/lib/character-direction/reference-binding";

const short = z.string().trim().min(1).max(300);
const medium = z.string().trim().min(1).max(1200);
const id = z.string().trim().min(1).max(100);
const score = z.number().min(0).max(1);

export const GenreSchema = z.enum([
  "ACTION","ADVENTURE","COMEDY","DRAMA","FANTASY","HORROR","MYSTERY",
  "ROMANCE","SCI_FI","SLICE_OF_LIFE","SPORTS","SUPERNATURAL","THRILLER","OTHER"
]);

export const CastRoleSchema = z.enum([
  "PROTAGONIST","ALLY","RIVAL","ANTAGONIST","MENTOR","SUPPORTING"
]);

export const BeatTypeSchema = z.enum([
  "HOOK","SETUP","DISCOVERY","CONFLICT","ESCALATION","REVEAL","EMOTIONAL","ACTION","CLIFFHANGER"
]);

export const StudioFeatureTypeSchema = z.enum([
  "POWER_SYSTEM","RELATIONSHIP_GRAPH","CLUE_LEDGER","INVENTORY","QUESTS",
  "FACTION_TRACKER","AUDIENCE_KNOWLEDGE","CHARACTER_KNOWLEDGE",
  "LOCATION_MAP","ABILITY_TRACKER","TIMELINE"
]);

export const SeriesBlueprintGenerationSchema = z.object({
  identity: z.object({
    title: z.string().trim().min(1).max(150),
    alternateTitles: z.array(z.string().trim().min(1).max(150)).max(5),
    logline: z.string().trim().min(1).max(500),
    shortPremise: medium,
    genres: z.array(GenreSchema).min(1).max(4),
    subgenres: z.array(short).max(8),
    intendedAudience: short,
    contentRating: z.string().trim().min(1).max(80)
  }).strict(),

  creativeDNA: z.object({
    visualStyle: z.object({
      description: medium,
      tags: z.array(short).max(12),
      colorLanguage: medium,
      lighting: medium,
      animationLanguage: medium,
      cameraLanguage: medium
    }).strict(),
    tone: z.object({
      primary: short,
      secondary: z.array(short).max(8),
      humor: medium,
      emotionalIntensity: score,
      darkness: score
    }).strict(),
    pacing: z.object({
      overall: medium,
      dialogueDensity: short,
      actionFrequency: short
    }).strict(),
    sound: z.object({
      musicDirection: medium,
      recurringMotifs: z.array(short).max(8),
      soundDesign: medium
    }).strict()
  }).strict(),

  storyEngine: z.object({
    centralConflict: medium,
    protagonistWant: medium,
    protagonistNeed: medium,
    stakes: z.array(medium).min(1).max(10),
    recurringSourcesOfConflict: z.array(medium).max(10),
    coreQuestions: z.array(medium).max(10),
    thematicQuestions: z.array(medium).max(10),
    promisesToAudience: z.array(medium).min(1).max(10)
  }).strict(),

  world: z.object({
    name: z.string().trim().min(1).max(150).nullable(),
    summary: z.string().trim().min(1).max(1800),
    rules: z.array(z.object({
      id,
      rule: medium,
      consequences: medium
    }).strict()).max(10),
    powerSystem: z.object({
      exists: z.boolean(),
      name: z.string().trim().min(1).max(150).nullable(),
      summary: z.string().trim().min(1).max(1200).nullable(),
      rules: z.array(medium).max(10),
      costs: z.array(medium).max(10),
      limitations: z.array(medium).max(10)
    }).strict(),
    factions: z.array(z.object({
      id,
      name: short,
      description: medium,
      goals: z.array(medium).max(8)
    }).strict()).max(8),
    locations: z.array(z.object({
      id,
      name: short,
      description: medium,
      narrativePurpose: medium,
      visualTags: z.array(short).max(12)
    }).strict()).max(12)
  }).strict(),

  cast: z.array(z.object({
    id,
    role: CastRoleSchema,
    name: short,
    storyFunction: medium,
    summary: medium,
    personalityTraits: z.array(short).max(10),
    want: medium,
    need: medium,
    internalConflict: medium,
    relationshipToProtagonist: medium,
    visualConcept: medium,
    characterSheetSeed: z.object({
      personality: medium,
      backstory: medium,
      communicationStyle: medium,
      relationshipStyle: medium,
      visualDescription: medium
    }).strict()
  }).strict()).min(3).max(6),

  relationships: z.array(z.object({
    fromCharacterId: id,
    toCharacterId: id,
    type: short,
    initialState: medium,
    tension: medium,
    desiredArc: medium
  }).strict()).max(20),

  season: z.object({
    format: z.object({
      episodeLengthSeconds: z.number().int().min(30).max(120),
      targetEpisodeCount: z.number().int().min(8).max(20)
    }).strict(),
    seasonQuestion: medium,
    beginning: medium,
    escalation: medium,
    midpoint: medium,
    crisis: medium,
    finale: medium,
    characterArcs: z.array(z.object({
      characterId: id,
      startingState: medium,
      endingState: medium
    }).strict()).max(6)
  }).strict(),

  episodeOne: z.object({
    title: short,
    purpose: medium,
    hook: medium,
    endingHook: medium,
    beats: z.array(z.object({
      id,
      type: BeatTypeSchema,
      summary: medium,
      involvedCharacterIds: z.array(id).min(1).max(6),
      locationId: id.nullable(),
      storyChange: medium
    }).strict()).min(4).max(8)
  }).strict(),

  canon: z.object({
    facts: z.array(z.object({
      id,
      subjectType: z.enum(["CHARACTER","WORLD","LOCATION","FACTION","STORY"]),
      subjectId: id.nullable(),
      fact: medium,
      mutable: z.boolean()
    }).strict()).max(24),
    mysteries: z.array(z.object({
      id,
      question: medium,
      answerKnownToCreator: z.string().trim().min(1).max(1200).nullable(),
      revealIntent: medium
    }).strict()).max(10)
  }).strict(),

  studioFeatures: z.array(z.object({
    type: StudioFeatureTypeSchema,
    reason: medium,
    priority: z.enum(["PRIMARY","SECONDARY"])
  }).strict()).max(11),

  clarification: z.object({
    needed: z.boolean(),
    questions: z.array(z.object({
      id,
      question: medium,
      whyItMatters: medium,
      impact: z.enum(["STORY","WORLD","CHARACTER","TONE","FORMAT"])
    }).strict()).max(3)
  }).strict(),

  confidence: z.object({
    overall: score,
    identity: score,
    world: score,
    cast: score,
    story: score,
    assumptions: z.array(medium).max(10)
  }).strict()
}).strict();

// Generation retains the original strict, required-field schema. Only the server
// attaches creator-selected direction, so model output cannot author tag metadata.
export const SeriesBlueprintSchema = SeriesBlueprintGenerationSchema.extend({
  cast: z.array(SeriesBlueprintGenerationSchema.shape.cast.element.extend({
    generationDirection: CharacterDirectionSchema.optional(),
    generationDirectionHistory: DirectionHistorySchema.optional(),
    referenceBindingHistory: ReferenceBindingHistorySchema.optional()
  })).min(3).max(6)
});

export type RuntimeSeriesBlueprint = z.infer<typeof SeriesBlueprintSchema>;
