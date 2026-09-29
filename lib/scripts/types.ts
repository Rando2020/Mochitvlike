import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";

export type ScriptStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
export type ScriptGenerationSource = "llm" | "repaired";

export type SceneScriptBlock =
  | { id: string; type: "ACTION"; text: string }
  | { id: string; type: "DIALOGUE"; characterId: string; text: string; deliveryIntent: string | null }
  | { id: string; type: "REACTION"; characterId: string; text: string }
  | { id: string; type: "PAUSE"; durationHint: "SHORT" | "MEDIUM" | "LONG"; purpose: string };

export type SceneScript = {
  id: string;
  sceneId: string;
  seriesId: string;
  version: number;
  identity: { title: string };
  estimatedDurationSeconds: number;
  blocks: SceneScriptBlock[];
  endingStateVerification: {
    requiredStoryChangeAchieved: boolean;
    explanation: string;
  };
  continuityVerification: {
    requiredCanonFactIdsUsed: string[];
    protectedMysteriesPreserved: string[];
    contradictionsDetected: string[];
  };
  confidence: {
    overall: number;
    assumptions: string[];
  };
};

export type ScriptContext = {
  seriesId: string;
  sceneId: string;
  version: number;
  episodeDurationSeconds: number;
  estimatedTargetSeconds: number;
  scene: SceneBlueprint;
  cast: Array<{
    id: string;
    name: string;
    personalityTraits: string[];
    communicationStyle: string;
    personality: string;
    relationshipToProtagonist: string;
  }>;
  relevantCanonFacts: SeriesBlueprint["canon"]["facts"];
  protectedMysteries: SeriesBlueprint["canon"]["mysteries"];
};

export type ScriptSummary = {
  id: string;
  version: number;
  status: ScriptStatus;
  estimatedDurationSeconds: number;
  updatedAt: string;
};
