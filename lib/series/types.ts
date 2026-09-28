export type Genre =
  | "ACTION"
  | "ADVENTURE"
  | "COMEDY"
  | "DRAMA"
  | "FANTASY"
  | "HORROR"
  | "MYSTERY"
  | "ROMANCE"
  | "SCI_FI"
  | "SLICE_OF_LIFE"
  | "SPORTS"
  | "SUPERNATURAL"
  | "THRILLER"
  | "OTHER";

export type CastRole =
  | "PROTAGONIST"
  | "ALLY"
  | "RIVAL"
  | "ANTAGONIST"
  | "MENTOR"
  | "SUPPORTING";

export type BeatType =
  | "HOOK"
  | "SETUP"
  | "DISCOVERY"
  | "CONFLICT"
  | "ESCALATION"
  | "REVEAL"
  | "EMOTIONAL"
  | "ACTION"
  | "CLIFFHANGER";

export type StudioFeatureType =
  | "POWER_SYSTEM"
  | "RELATIONSHIP_GRAPH"
  | "CLUE_LEDGER"
  | "INVENTORY"
  | "QUESTS"
  | "FACTION_TRACKER"
  | "AUDIENCE_KNOWLEDGE"
  | "CHARACTER_KNOWLEDGE"
  | "LOCATION_MAP"
  | "ABILITY_TRACKER"
  | "TIMELINE";

export type StudioFeaturePriority = "PRIMARY" | "SECONDARY";

export type CastMember = {
  id: string;
  role: CastRole;
  name: string;
  storyFunction: string;
  summary: string;
  personalityTraits: string[];
  want: string;
  need: string;
  internalConflict: string;
  relationshipToProtagonist: string;
  visualConcept: string;
  characterSheetSeed: {
    personality: string;
    backstory: string;
    communicationStyle: string;
    relationshipStyle: string;
    visualDescription: string;
  };
};

export type StudioFeature = {
  type: StudioFeatureType;
  reason: string;
  priority: StudioFeaturePriority;
};

export type SeriesBlueprint = {
  identity: {
    title: string;
    alternateTitles: string[];
    logline: string;
    shortPremise: string;
    genres: Genre[];
    subgenres: string[];
    intendedAudience: string;
    contentRating: string;
  };
  creativeDNA: {
    visualStyle: {
      description: string;
      tags: string[];
      colorLanguage: string;
      lighting: string;
      animationLanguage: string;
      cameraLanguage: string;
    };
    tone: {
      primary: string;
      secondary: string[];
      humor: string;
      emotionalIntensity: number;
      darkness: number;
    };
    pacing: {
      overall: string;
      dialogueDensity: string;
      actionFrequency: string;
    };
    sound: {
      musicDirection: string;
      recurringMotifs: string[];
      soundDesign: string;
    };
  };
  storyEngine: {
    centralConflict: string;
    protagonistWant: string;
    protagonistNeed: string;
    stakes: string[];
    recurringSourcesOfConflict: string[];
    coreQuestions: string[];
    thematicQuestions: string[];
    promisesToAudience: string[];
  };
  world: {
    name: string | null;
    summary: string;
    rules: Array<{
      id: string;
      rule: string;
      consequences: string;
    }>;
    powerSystem: {
      exists: boolean;
      name: string | null;
      summary: string | null;
      rules: string[];
      costs: string[];
      limitations: string[];
    };
    factions: Array<{
      id: string;
      name: string;
      description: string;
      goals: string[];
    }>;
    locations: Array<{
      id: string;
      name: string;
      description: string;
      narrativePurpose: string;
      visualTags: string[];
    }>;
  };
  cast: CastMember[];
  relationships: Array<{
    fromCharacterId: string;
    toCharacterId: string;
    type: string;
    initialState: string;
    tension: string;
    desiredArc: string;
  }>;
  season: {
    format: {
      episodeLengthSeconds: number;
      targetEpisodeCount: number;
    };
    seasonQuestion: string;
    beginning: string;
    escalation: string;
    midpoint: string;
    crisis: string;
    finale: string;
    characterArcs: Array<{
      characterId: string;
      startingState: string;
      endingState: string;
    }>;
  };
  episodeOne: {
    title: string;
    purpose: string;
    hook: string;
    endingHook: string;
    beats: Array<{
      id: string;
      type: BeatType;
      summary: string;
      involvedCharacterIds: string[];
      locationId: string | null;
      storyChange: string;
    }>;
  };
  canon: {
    facts: Array<{
      id: string;
      subjectType: "CHARACTER" | "WORLD" | "LOCATION" | "FACTION" | "STORY";
      subjectId: string | null;
      fact: string;
      mutable: boolean;
    }>;
    mysteries: Array<{
      id: string;
      question: string;
      answerKnownToCreator: string | null;
      revealIntent: string;
    }>;
  };
  studioFeatures: StudioFeature[];
  clarification: {
    needed: boolean;
    questions: Array<{
      id: string;
      question: string;
      whyItMatters: string;
      impact: "STORY" | "WORLD" | "CHARACTER" | "TONE" | "FORMAT";
    }>;
  };
  confidence: {
    overall: number;
    identity: number;
    world: number;
    cast: number;
    story: number;
    assumptions: string[];
  };
};
