import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SceneScript } from "@/lib/scripts/types";
import type { SeriesBlueprint } from "@/lib/series/types";

export type VisualPlanStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
export type VisualPlanGenerationSource = "llm" | "repaired";
export type MotionIntent = "STATIC" | "SUBTLE" | "ACTIVE" | "CHAOTIC";
export type TransitionIntent = "CONTINUE" | "CUT" | "HOLD" | "REVEAL" | "SHIFT";

export type VisualPlan = {
  id: string;
  seriesId: string;
  sceneId: string;
  scriptId: string;
  version: number;
  identity: { title: string };
  visualIntent: {
    sceneObjective: string;
    emotionalArc: string;
    visualThesis: string;
    pacingIntent: string;
  };
  continuity: {
    locationId: string | null;
    characters: Array<{
      characterId: string;
      requiredAppearanceNotes: string[];
      emotionalStart: string;
      emotionalEnd: string;
      continuityNotes: string[];
    }>;
    environmentRules: string[];
    powerSystemRules: string[];
    protectedCanon: string[];
  };
  staging: {
    geography: string;
    characterPositions: Array<{
      characterId: string;
      initialPosition: string;
      movementIntent: string;
    }>;
    importantProps: string[];
    interactionZones: string[];
  };
  visualBeats: Array<{
    id: string;
    sourceScriptBlockIds: string[];
    purpose: string;
    storyMoment: string;
    emotionalFunction: string;
    staging: string;
    compositionIntent: string;
    focalCharacterIds: string[];
    supportingCharacterIds: string[];
    environmentFocus: string | null;
    motionIntent: MotionIntent;
    transitionIntent: TransitionIntent;
    estimatedDurationSeconds: number;
  }>;
  continuityChecks: {
    characterConsistency: string[];
    environmentConsistency: string[];
    protectedMysteries: string[];
    forbiddenVisualContradictions: string[];
  };
  confidence: {
    overall: number;
    assumptions: string[];
  };
};

export type VisualPlanningContext = {
  seriesId: string;
  sceneId: string;
  scriptId: string;
  version: number;
  scene: SceneBlueprint;
  script: SceneScript;
  creativeDNA: SeriesBlueprint["creativeDNA"]["visualStyle"];
  location: SeriesBlueprint["world"]["locations"][number] | null;
  cast: Array<{
    id: string;
    name: string;
    visualConcept: string;
    visualDescription: string;
    personalityTraits: string[];
  }>;
  worldRules: SeriesBlueprint["world"]["rules"];
  powerSystem: SeriesBlueprint["world"]["powerSystem"] | null;
  protectedMysteries: SeriesBlueprint["canon"]["mysteries"];
};

export type VisualPlanSummary = {
  id: string;
  version: number;
  status: VisualPlanStatus;
  visualBeatCount: number;
  estimatedDurationSeconds: number;
  updatedAt: string;
};
