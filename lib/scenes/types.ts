import type { SeriesBlueprint } from "@/lib/series/types";

export type SceneStatus = "DRAFT" | "READY" | "ARCHIVED";
export type SceneGenerationSource = "llm" | "repaired";

export type SceneContext = {
  seriesId: string;
  episodeKey: "episodeOne";
  sourceBeat: SeriesBlueprint["episodeOne"]["beats"][number];
  involvedCast: Array<Pick<
    SeriesBlueprint["cast"][number],
    "id" | "name" | "role" | "storyFunction" | "summary" | "want" | "need" | "internalConflict" | "relationshipToProtagonist"
  >>;
  relationships: SeriesBlueprint["relationships"];
  location: SeriesBlueprint["world"]["locations"][number] | null;
  worldRules: SeriesBlueprint["world"]["rules"];
  powerSystem: SeriesBlueprint["world"]["powerSystem"] | null;
  canonFacts: SeriesBlueprint["canon"]["facts"];
  mysteries: SeriesBlueprint["canon"]["mysteries"];
  season: Pick<
    SeriesBlueprint["season"],
    "seasonQuestion" | "beginning" | "escalation" | "midpoint" | "crisis" | "finale"
  >;
};

export type SceneBlueprint = {
  id: string;
  seriesId: string;
  episodeKey: "episodeOne";
  sourceBeatId: string;
  identity: {
    title: string;
    shortDescription: string;
  };
  storyPurpose: {
    objective: string;
    requiredStoryChange: string;
    whyThisSceneExists: string;
  };
  openingState: {
    summary: string;
    emotionalStateByCharacter: Array<{
      characterId: string;
      state: string;
    }>;
    knownFactsByCharacter: Array<{
      characterId: string;
      knownCanonFactIds: string[];
      notes: string[];
    }>;
  };
  cast: Array<{
    characterId: string;
    sceneRole: string;
    immediateWant: string;
    pressure: string;
  }>;
  location: {
    locationId: string | null;
    settingNotes: string;
  };
  dramaticStructure: {
    entryBeat: string;
    escalation: string;
    turn: string;
    exitBeat: string;
  };
  dialogueIntent: Array<{
    characterId: string;
    objective: string;
    subtext: string;
    mustCommunicate: string[];
    mustNotReveal: string[];
  }>;
  actionIntent: {
    summary: string;
    requiredActions: string[];
    optionalBusiness: string[];
  };
  emotionalTurn: {
    from: string;
    to: string;
    trigger: string;
  };
  endingState: {
    summary: string;
    characterChanges: Array<{
      characterId: string;
      change: string;
    }>;
    knowledgeChanges: Array<{
      characterId: string;
      learns: string[];
    }>;
    relationshipChanges: Array<{
      fromCharacterId: string;
      toCharacterId: string;
      change: string;
    }>;
  };
  proposedCanonChanges: Array<{
    type: "ADD_FACT" | "CHANGE_MUTABLE_FACT" | "RESOLVE_MYSTERY" | "ADD_MYSTERY";
    explanation: string;
    targetCanonId: string | null;
    proposedValue: string;
  }>;
  continuityChecks: {
    requiredCanonFactIds: string[];
    forbiddenContradictions: string[];
    unresolvedQuestionsProtected: string[];
  };
  confidence: {
    overall: number;
    assumptions: string[];
  };
};

export type SceneSummary = {
  id: string;
  sourceBeatId: string;
  title: string;
  status: SceneStatus;
  updatedAt: string;
};
