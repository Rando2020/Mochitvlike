import type { VisualPlan } from "../types";

export function buildValidVisualPlan(overrides: Partial<VisualPlan> = {}): VisualPlan {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    seriesId: "22222222-2222-4222-8222-222222222222",
    sceneId: "11111111-1111-4111-8111-111111111111",
    scriptId: "33333333-3333-4333-8333-333333333333",
    version: 1,
    identity: { title: "The Choice to Heal · Visual Plan" },
    visualIntent: {
      sceneObjective: "Make Orin's choice to reveal his forbidden gift visually unavoidable.",
      emotionalArc: "Guarded calculation becomes terrified commitment.",
      visualThesis: "Distance collapses as Orin is forced to move physically closer to Mara.",
      pacingIntent: "Hold longer on hesitation, then accelerate into the irreversible choice."
    },
    continuity: {
      locationId: "location_border_town",
      characters: [
        {
          characterId: "char_orin",
          requiredAppearanceNotes: ["Wrapped hands", "Weathered field-medic silhouette"],
          emotionalStart: "Guarded and calculating",
          emotionalEnd: "Terrified but committed",
          continuityNotes: ["Keep his wrapped hands visible before the final action."]
        },
        {
          characterId: "char_mara",
          requiredAppearanceNotes: ["Battle-worn light armor"],
          emotionalStart: "Weak but observant",
          emotionalEnd: "Suspicious and dependent",
          continuityNotes: ["Her worsening physical state must remain readable."]
        }
      ],
      environmentRules: ["Rook's Hollow remains a damaged temporary-clinic environment."],
      powerSystemRules: ["Orin must physically touch the injured person."],
      protectedCanon: ["fact_transfer", "fact_banned"]
    },
    staging: {
      geography: "Mara remains low and foregrounded while Orin begins at arm's length near the treatment supplies.",
      characterPositions: [
        { characterId: "char_orin", initialPosition: "Beside the treatment supplies, slightly withdrawn.", movementIntent: "Gradually closes the distance until he takes Mara's wrist." },
        { characterId: "char_mara", initialPosition: "Low on the treatment surface.", movementIntent: "Minimal movement; attention shifts toward Orin's wrapped hand." }
      ],
      importantProps: ["Blood-soaked bandage", "Ordinary medical supplies"],
      interactionZones: ["Treatment surface", "Supply edge"]
    },
    visualBeats: [
      {
        id: "visual_1",
        sourceScriptBlockIds: ["block_1"],
        purpose: "Establish ordinary medicine failing.",
        storyMoment: "The fresh bandage immediately bleeds through.",
        emotionalFunction: "Collapse Orin's remaining excuse to stay ordinary.",
        staging: "Keep Mara anchored while Orin evaluates the failure.",
        compositionIntent: "Prioritize the failed bandage and Orin's reaction in the same readable visual relationship.",
        focalCharacterIds: ["char_orin"],
        supportingCharacterIds: ["char_mara"],
        environmentFocus: "Treatment supplies",
        motionIntent: "SUBTLE",
        transitionIntent: "HOLD",
        estimatedDurationSeconds: 4
      },
      {
        id: "visual_2",
        sourceScriptBlockIds: ["block_2", "block_3"],
        purpose: "Make Mara notice Orin's hesitation.",
        storyMoment: "Mara calls out his pause and Orin hides fear behind humor.",
        emotionalFunction: "Turn internal hesitation into interpersonal pressure.",
        staging: "Keep their eyelines connected without allowing Orin to retreat.",
        compositionIntent: "Mara remains vulnerable but visually observant; Orin's defensive posture carries the subtext.",
        focalCharacterIds: ["char_mara", "char_orin"],
        supportingCharacterIds: [],
        environmentFocus: null,
        motionIntent: "STATIC",
        transitionIntent: "CONTINUE",
        estimatedDurationSeconds: 6
      },
      {
        id: "visual_3",
        sourceScriptBlockIds: ["block_4", "block_5"],
        purpose: "Expose the physical tell that Orin has another option.",
        storyMoment: "Mara notices his wrapped hand hovering over the wound.",
        emotionalFunction: "Hold the decision before it becomes action.",
        staging: "Orin's hand enters Mara's attention before it reaches her.",
        compositionIntent: "Use the wrapped hand as the visual bridge between their faces and the wound.",
        focalCharacterIds: ["char_orin", "char_mara"],
        supportingCharacterIds: [],
        environmentFocus: null,
        motionIntent: "SUBTLE",
        transitionIntent: "HOLD",
        estimatedDurationSeconds: 3
      },
      {
        id: "visual_4",
        sourceScriptBlockIds: ["block_6"],
        purpose: "Make the choice irreversible.",
        storyMoment: "Orin takes Mara's wrist and commits to forbidden healing.",
        emotionalFunction: "Convert fear into action.",
        staging: "The physical gap closes completely.",
        compositionIntent: "Center the contact as the irreversible story action rather than spectacle.",
        focalCharacterIds: ["char_orin", "char_mara"],
        supportingCharacterIds: [],
        environmentFocus: null,
        motionIntent: "ACTIVE",
        transitionIntent: "REVEAL",
        estimatedDurationSeconds: 5
      }
    ],
    continuityChecks: {
      characterConsistency: ["Orin's wrapped hands remain consistent across the scene."],
      environmentConsistency: ["The scene remains in the same Rook's Hollow treatment area."],
      protectedMysteries: ["mystery_creatures"],
      forbiddenVisualContradictions: ["Do not visually imply Orin can erase injuries."]
    },
    confidence: { overall: 0.93, assumptions: [] },
    ...overrides
  };
}
