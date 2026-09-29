import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import type { SceneBlueprint } from "../types";

export function buildValidScene(overrides: Partial<SceneBlueprint> = {}): SceneBlueprint {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    seriesId: "22222222-2222-4222-8222-222222222222",
    episodeKey: "episodeOne",
    sourceBeatId: "beat_1",
    identity: {
      title: "The Choice to Heal",
      shortDescription: "Orin must decide whether to expose his forbidden gift to save Mara."
    },
    storyPurpose: {
      objective: "Force Orin to choose between anonymity and saving Mara.",
      requiredStoryChange: theWoundsWeKeep.episodeOne.beats[0].storyChange,
      whyThisSceneExists: "The premise becomes unavoidable through a life-or-death choice."
    },
    openingState: {
      summary: "Mara is dying and Orin is still pretending he cannot help.",
      emotionalStateByCharacter: [
        { characterId: "char_orin", state: "Guarded, frightened, and calculating." },
        { characterId: "char_mara", state: "Fading but suspicious of Orin's hesitation." }
      ],
      knownFactsByCharacter: [
        { characterId: "char_orin", knownCanonFactIds: ["fact_transfer", "fact_banned"], notes: [] },
        { characterId: "char_mara", knownCanonFactIds: ["fact_banned"], notes: ["She does not know Orin can heal."] }
      ]
    },
    cast: [
      {
        characterId: "char_orin",
        sceneRole: "Decision-maker",
        immediateWant: "Keep his identity hidden while preventing Mara's death.",
        pressure: "Ordinary medicine will not save her."
      },
      {
        characterId: "char_mara",
        sceneRole: "Catalyst",
        immediateWant: "Survive and understand why Orin is hesitating.",
        pressure: "Her condition is rapidly worsening."
      }
    ],
    location: {
      locationId: "location_border_town",
      settingNotes: "A semi-private corner of Rook's Hollow where discovery is possible but not guaranteed."
    },
    dramaticStructure: {
      entryBeat: "Orin confirms Mara will die without impossible intervention.",
      escalation: "Mara notices he knows more than he admits.",
      turn: "Orin chooses to risk exposure rather than let her die.",
      exitBeat: "He prepares to use forbidden healing."
    },
    dialogueIntent: [
      {
        characterId: "char_orin",
        objective: "Make Mara stop asking questions while he buys seconds to decide.",
        subtext: "He is terrified of being seen as a healer.",
        mustCommunicate: ["Ordinary treatment is failing."],
        mustNotReveal: ["The full nature of Burden Healing."]
      },
      {
        characterId: "char_mara",
        objective: "Force Orin to admit he has another option.",
        subtext: "She can tell he is withholding something.",
        mustCommunicate: ["She knows he is making a choice."],
        mustNotReveal: []
      }
    ],
    actionIntent: {
      summary: "Orin exhausts ordinary options, then physically commits to forbidden healing.",
      requiredActions: ["Verify the wound is fatal without intervention.", "Choose to heal Mara."],
      optionalBusiness: ["Orin rewraps one hand before touching the wound."]
    },
    emotionalTurn: {
      from: "Avoidance",
      to: "Terrified commitment",
      trigger: "Orin realizes Mara will die before anyone else can help."
    },
    endingState: {
      summary: "Orin has crossed the line from hiding to using his forbidden gift.",
      characterChanges: [
        { characterId: "char_orin", change: "He accepts immediate exposure risk to save Mara." },
        { characterId: "char_mara", change: "She becomes certain Orin has concealed unusual medical knowledge." }
      ],
      knowledgeChanges: [
        { characterId: "char_mara", learns: ["Orin has access to a treatment he was hiding."] }
      ],
      relationshipChanges: [
        {
          fromCharacterId: "char_mara",
          toCharacterId: "char_orin",
          change: "Suspicion becomes personal curiosity and reluctant dependence."
        }
      ]
    },
    proposedCanonChanges: [],
    continuityChecks: {
      requiredCanonFactIds: ["fact_transfer", "fact_banned"],
      forbiddenContradictions: ["Orin cannot erase an injury.", "Mara must not already know Orin is a forbidden healer."],
      unresolvedQuestionsProtected: ["What are the creatures created by absorbed wounds?"]
    },
    confidence: {
      overall: 0.94,
      assumptions: []
    },
    ...overrides
  };
}
