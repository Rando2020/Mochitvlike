import type { SceneScript } from "../types";

export function buildValidScript(overrides: Partial<SceneScript> = {}): SceneScript {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    sceneId: "11111111-1111-4111-8111-111111111111",
    seriesId: "22222222-2222-4222-8222-222222222222",
    version: 1,
    identity: { title: "The Choice to Heal" },
    estimatedDurationSeconds: 18,
    blocks: [
      {
        id: "block_1",
        type: "ACTION",
        text: "Orin tightens the bandage. The blood comes through immediately."
      },
      {
        id: "block_2",
        type: "DIALOGUE",
        characterId: "char_mara",
        text: "You stopped moving.",
        deliveryIntent: "Weak, but watching him closely."
      },
      {
        id: "block_3",
        type: "DIALOGUE",
        characterId: "char_orin",
        text: "I'm thinking. It's a terrible habit.",
        deliveryIntent: "Dry humor covering fear."
      },
      {
        id: "block_4",
        type: "REACTION",
        characterId: "char_mara",
        text: "Mara catches his wrapped hand hovering over the wound."
      },
      {
        id: "block_5",
        type: "PAUSE",
        durationHint: "SHORT",
        purpose: "Give Orin one final beat to choose exposure over safety."
      },
      {
        id: "block_6",
        type: "ACTION",
        text: "Orin takes her wrist and commits to the forbidden healing."
      }
    ],
    endingStateVerification: {
      requiredStoryChangeAchieved: true,
      explanation: "Orin chooses exposure rather than watching Mara die."
    },
    continuityVerification: {
      requiredCanonFactIdsUsed: ["fact_transfer", "fact_banned"],
      protectedMysteriesPreserved: ["mystery_creatures"],
      contradictionsDetected: []
    },
    confidence: {
      overall: 0.93,
      assumptions: []
    },
    ...overrides
  };
}
