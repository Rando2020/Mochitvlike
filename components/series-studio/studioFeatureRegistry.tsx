import type { ComponentType } from "react";
import type { SeriesBlueprint, StudioFeature, StudioFeatureType } from "@/lib/series/types";
import { AbilityTrackerPanel } from "./studio-features/AbilityTrackerPanel";
import { CharacterKnowledgePanel } from "./studio-features/CharacterKnowledgePanel";
import { ClueLedgerPanel } from "./studio-features/ClueLedgerPanel";
import { LocationMapPanel } from "./studio-features/LocationMapPanel";
import { PowerSystemPanel } from "./studio-features/PowerSystemPanel";
import { ReadyFeaturePanel } from "./studio-features/ReadyFeaturePanel";
import { RelationshipGraphPanel } from "./studio-features/RelationshipGraphPanel";

export type StudioFeaturePanelProps = {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeatureType) => void;
};

export type StudioFeatureDefinition = {
  label: string;
  description: string;
  icon: string;
  component: ComponentType<StudioFeaturePanelProps>;
  priorityBehavior: "DASHBOARD" | "STORY_TOOLS";
};

const generic = ReadyFeaturePanel as ComponentType<StudioFeaturePanelProps>;

export const STUDIO_FEATURE_REGISTRY: Record<StudioFeatureType, StudioFeatureDefinition> = {
  POWER_SYSTEM: {
    label: "Power System",
    description: "Rules, costs, and limits that make power create story problems.",
    icon: "✦",
    component: PowerSystemPanel,
    priorityBehavior: "DASHBOARD"
  },
  RELATIONSHIP_GRAPH: {
    label: "Relationships",
    description: "Track how trust, conflict, and attachment evolve.",
    icon: "↔",
    component: RelationshipGraphPanel,
    priorityBehavior: "DASHBOARD"
  },
  CLUE_LEDGER: {
    label: "Clue Ledger",
    description: "Track evidence, reveals, and unresolved questions.",
    icon: "◇",
    component: ClueLedgerPanel,
    priorityBehavior: "DASHBOARD"
  },
  INVENTORY: {
    label: "Inventory",
    description: "Track story-relevant items without turning the show into a spreadsheet.",
    icon: "▣",
    component: generic,
    priorityBehavior: "STORY_TOOLS"
  },
  QUESTS: {
    label: "Quests",
    description: "Track active goals and the consequences of pursuing them.",
    icon: "→",
    component: generic,
    priorityBehavior: "STORY_TOOLS"
  },
  FACTION_TRACKER: {
    label: "Factions",
    description: "See what each group wants and where those goals collide.",
    icon: "◎",
    component: generic,
    priorityBehavior: "STORY_TOOLS"
  },
  AUDIENCE_KNOWLEDGE: {
    label: "Audience Knowledge",
    description: "Separate what viewers know from what the cast knows.",
    icon: "◉",
    component: generic,
    priorityBehavior: "STORY_TOOLS"
  },
  CHARACTER_KNOWLEDGE: {
    label: "Character Knowledge",
    description: "Track secrets, discoveries, and information asymmetry.",
    icon: "⌁",
    component: CharacterKnowledgePanel,
    priorityBehavior: "STORY_TOOLS"
  },
  LOCATION_MAP: {
    label: "Location Map",
    description: "Keep important places and story movement coherent.",
    icon: "⌖",
    component: LocationMapPanel,
    priorityBehavior: "STORY_TOOLS"
  },
  ABILITY_TRACKER: {
    label: "Ability Tracker",
    description: "Track established abilities, costs, and consequences.",
    icon: "⚡",
    component: AbilityTrackerPanel,
    priorityBehavior: "STORY_TOOLS"
  },
  TIMELINE: {
    label: "Timeline",
    description: "Keep events, reveals, and chronology aligned.",
    icon: "≋",
    component: generic,
    priorityBehavior: "STORY_TOOLS"
  }
};

export function getStudioFeatureDefinition(type: StudioFeatureType) {
  return STUDIO_FEATURE_REGISTRY[type];
}
