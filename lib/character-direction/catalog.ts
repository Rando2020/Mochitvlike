// Stable IDs are persisted; labels and bounded descriptions compile into guidance.
export const DIRECTION_CATALOG = {
  personality: [
    { id: "compassionate", label: "Compassionate", guidance: "Notices others' distress and chooses to help, even when it costs them." },
    { id: "guarded", label: "Guarded", guidance: "Protects their feelings; trust develops through actions rather than quick confessions." },
    { id: "analytical", label: "Analytical", guidance: "Looks for evidence and considers consequences before deciding." },
    { id: "impulsive", label: "Impulsive", guidance: "Acts quickly under pressure and must live with the consequences." },
    { id: "playful", label: "Playful", guidance: "Uses wit and curiosity without making every moment a joke." },
    { id: "resolute", label: "Resolute", guidance: "Stays committed when challenged, while remaining capable of doubt." }
  ],
  body: [
    { id: "slim", label: "Slim", guidance: "A slim build with a narrow silhouette." },
    { id: "athletic", label: "Athletic", guidance: "An athletic build with functional muscle definition." },
    { id: "muscular", label: "Muscular", guidance: "A muscular build with pronounced muscle definition." },
    { id: "broad", label: "Broad", guidance: "A broad build with a substantial silhouette." },
    { id: "stocky", label: "Stocky", guidance: "A stocky build with compact, substantial proportions." }
  ],
  clothing: [
    { id: "practical", label: "Practical", guidance: "Practical clothing suited to the character's work and setting." },
    { id: "travel-worn", label: "Travel-worn", guidance: "Travel-worn clothing with coherent wear, repairs, and functional layers." },
    { id: "tailored", label: "Tailored", guidance: "Tailored clothing with deliberate, clean lines appropriate to the setting." },
    { id: "armored", label: "Armored", guidance: "Protective armor with consistent, functional construction appropriate to the setting." }
  ],
  voiceTexture: [
    { id: "warm", label: "Warm", guidance: "Use a warm vocal texture." },
    { id: "clear", label: "Clear", guidance: "Use a clear vocal texture." },
    { id: "raspy", label: "Raspy", guidance: "Use a lightly raspy, intelligible vocal texture." },
    { id: "airy", label: "Airy", guidance: "Use a lightly airy, intelligible vocal texture." }
  ],
  voiceDelivery: [
    { id: "calm", label: "Calm", guidance: "Use calm, natural delivery without monotony." },
    { id: "animated", label: "Animated", guidance: "Use animated, conversational delivery." },
    { id: "firm", label: "Firm", guidance: "Use firm delivery without shouting by default." }
  ],
  voicePace: [
    { id: "measured", label: "Measured", guidance: "Use a measured pace with natural phrasing." },
    { id: "brisk", label: "Brisk", guidance: "Use a brisk, intelligible pace." }
  ]
} as const;
export type DirectionGroup = keyof typeof DIRECTION_CATALOG;
