import type { SeriesIdeaRequest } from "./generationRequest";
import type { SeriesBlueprint } from "./types";
import { validateSeriesBlueprintForWrite } from "./persistence/validatePersistedSeries";

/**
 * No model call, sample fiction, or media generation.
 * This intentionally incomplete scaffold is clearly marked as a creator draft.
 * The creator's own idea is preserved verbatim in bounded brief segments.
 */
export function buildStarterBlueprint(input: SeriesIdeaRequest): SeriesBlueprint {
  const idea = input.idea.trim();
  const initialTitle = idea.split(/[\n.!?]/, 1)[0]?.trim() || idea;
  const title = initialTitle.length > 125 ? initialTitle.slice(0, 122) + "…" : initialTitle;
  const protagonistId = "char_main";
  const otherId = "char_support";
  const obstacleId = "char_counterforce";
  const pending = "To be decided by the creator.";
  const noteChunks = idea.match(/[\s\S]{1,1000}/g) ?? [];
  const cast = [
    {
      id: protagonistId, role: "PROTAGONIST" as const, name: "Main character — rename me",
      storyFunction: pending, summary: pending, personalityTraits: [],
      want: pending, need: pending, internalConflict: pending,
      relationshipToProtagonist: "Main character",
      visualConcept: pending,
      characterSheetSeed: {
        personality: pending, backstory: pending, communicationStyle: pending,
        relationshipStyle: pending, visualDescription: pending
      },
      ...(input.protagonistDirection ? { generationDirection: input.protagonistDirection } : {})
    },
    {
      id: otherId, role: "ALLY" as const, name: "Supporting character — rename me",
      storyFunction: pending, summary: pending, personalityTraits: [],
      want: pending, need: pending, internalConflict: pending,
      relationshipToProtagonist: pending, visualConcept: pending,
      characterSheetSeed: {
        personality: pending, backstory: pending, communicationStyle: pending,
        relationshipStyle: pending, visualDescription: pending
      }
    },
    {
      id: obstacleId, role: "ANTAGONIST" as const, name: "Counterforce — rename me",
      storyFunction: pending, summary: pending, personalityTraits: [],
      want: pending, need: pending, internalConflict: pending,
      relationshipToProtagonist: pending, visualConcept: pending,
      characterSheetSeed: {
        personality: pending, backstory: pending, communicationStyle: pending,
        relationshipStyle: pending, visualDescription: pending
      }
    }
  ];
  return validateSeriesBlueprintForWrite({
    identity: {
      title, alternateTitles: [], logline: idea.slice(0, 500),
      shortPremise: idea.slice(0, 1200), genres: ["OTHER"], subgenres: [],
      intendedAudience: pending, contentRating: "Unrated — draft"
    },
    creativeDNA: {
      visualStyle: {
        description: pending, tags: [], colorLanguage: pending, lighting: pending,
        animationLanguage: pending, cameraLanguage: pending
      },
      tone: { primary: pending, secondary: [], humor: pending, emotionalIntensity: 0.5, darkness: 0.5 },
      pacing: { overall: pending, dialogueDensity: pending, actionFrequency: pending },
      sound: { musicDirection: pending, recurringMotifs: [], soundDesign: pending }
    },
    storyEngine: {
      centralConflict: pending, protagonistWant: pending, protagonistNeed: pending,
      stakes: [pending], recurringSourcesOfConflict: [],
      coreQuestions: [], thematicQuestions: [],
      promisesToAudience: ["The creator will define the story promise."]
    },
    world: {
      name: null, summary: pending, rules: [],
      powerSystem: { exists: false, name: null, summary: null, rules: [], costs: [], limitations: [] },
      factions: [], locations: []
    },
    cast, relationships: [],
    season: {
      format: {
        episodeLengthSeconds: input.preferences?.episodeLengthSeconds ?? 60,
        targetEpisodeCount: input.preferences?.targetEpisodeCount ?? 12
      },
      seasonQuestion: pending, beginning: pending, escalation: pending,
      midpoint: pending, crisis: pending, finale: pending, characterArcs: []
    },
    episodeOne: {
      title: "Episode 1 — untitled",
      purpose: "Opening episode scaffold, not a generated scene.",
      hook: pending, endingHook: pending,
      beats: [
        { id: "beat_1", type: "HOOK", summary: pending, involvedCharacterIds: [protagonistId], locationId: null, storyChange: "The creator will define the opening hook." },
        { id: "beat_2", type: "SETUP", summary: pending, involvedCharacterIds: [protagonistId], locationId: null, storyChange: "The creator will establish the situation." },
        { id: "beat_3", type: "CONFLICT", summary: pending, involvedCharacterIds: [protagonistId], locationId: null, storyChange: "The creator will establish the conflict." },
        { id: "beat_4", type: "CLIFFHANGER", summary: pending, involvedCharacterIds: [protagonistId], locationId: null, storyChange: "The creator will define the ending turn." }
      ]
    },
    canon: { facts: [], mysteries: [] },
    studioFeatures: [],
    clarification: {
      needed: true,
      questions: [
        { id: "starter_main_character", question: "Who is the protagonist?", whyItMatters: "Name and define the main character before scene production.", impact: "CHARACTER" },
        { id: "starter_world", question: "Where does this story unfold?", whyItMatters: "Define the world and its constraints.", impact: "WORLD" },
        { id: "starter_opening", question: "What happens in Episode 1?", whyItMatters: "Replace the placeholder beats with an actual scene direction.", impact: "STORY" }
      ]
    },
    confidence: {
      overall: 0, identity: 0, world: 0, cast: 0, story: 0,
      assumptions: [
        "STARTER ONLY: no AI-generated plot, cast or scenes. Review all placeholder fields.",
        ...noteChunks.map((chunk, index) => `Original creator idea, part ${index + 1}/${noteChunks.length}: ${chunk}`)
      ]
    }
  });
}
