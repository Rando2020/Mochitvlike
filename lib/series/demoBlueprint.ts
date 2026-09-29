import type { SeriesBlueprint } from "./types";

export const theWoundsWeKeep: SeriesBlueprint = {
  identity: {
    title: "The Wounds We Keep",
    alternateTitles: ["Hollow Remedy"],
    logline: "A disgraced healer who pulls injuries from others discovers every wound he absorbs becomes a living creature inside him.",
    shortPremise: "Former battlefield healer Orin survives by secretly using a forbidden gift. Every injury he removes returns as something alive within him.",
    genres: ["FANTASY", "DRAMA", "COMEDY"],
    subgenres: ["dark fantasy", "found family"],
    intendedAudience: "Teen and adult character-driven fantasy viewers",
    contentRating: "Teen"
  },
  creativeDNA: {
    visualStyle: {
      description: "Weathered fantasy environments contrasted with strangely beautiful manifestations of pain.",
      tags: ["dark fantasy", "weathered", "organic magic", "expressive characters"],
      colorLanguage: "Muted earth tones punctured by vivid unnatural wound colors.",
      lighting: "Natural low-key light interrupted by luminous supernatural effects.",
      animationLanguage: "Grounded acting with sudden surreal transformations during healing.",
      cameraLanguage: "Intimate framing for emotion, distorted compositions when internal creatures emerge."
    },
    tone: {
      primary: "Melancholic adventure",
      secondary: ["dryly funny", "warm", "unsettling"],
      humor: "Character friction and exhausted people coping badly.",
      emotionalIntensity: 0.76,
      darkness: 0.67
    },
    pacing: {
      overall: "Character-first short episodes with one meaningful escalation per installment.",
      dialogueDensity: "Moderate",
      actionFrequency: "Occasional and consequence-driven"
    },
    sound: {
      musicDirection: "Sparse strings, fragile vocal textures, heavier percussion when wounds surface.",
      recurringMotifs: ["distorted heartbeat", "three-note healing theme"],
      soundDesign: "Healing begins quietly while wound-creatures introduce organic sounds that do not belong."
    }
  },
  storyEngine: {
    centralConflict: "Orin wants to keep healing people even after learning every act creates another dangerous being inside him.",
    protagonistWant: "Prove he can still save people and redeem his ruined reputation.",
    protagonistNeed: "Accept that being useful to others is not the same thing as having value.",
    stakes: [
      "Every person Orin heals increases the unknown danger inside him.",
      "Refusing to heal someone can cost a life.",
      "Discovery of his forbidden ability could make him a target."
    ],
    recurringSourcesOfConflict: [
      "Orin must decide which injuries are worth absorbing.",
      "His companions disagree over whether he should continue healing."
    ],
    coreQuestions: [
      "What exactly are the creatures inside Orin?",
      "Can an absorbed wound ever truly be destroyed?"
    ],
    thematicQuestions: [
      "How much suffering can someone carry for others before helping becomes self-destruction?"
    ],
    promisesToAudience: [
      "Discover a new consequence of Orin's healing ability.",
      "Watch damaged strangers slowly become a family.",
      "Learn what the oldest creature inside Orin wants."
    ]
  },
  world: {
    name: "Veyr",
    summary: "A war-scarred fantasy region where magical healing was outlawed after an unexplained catastrophe.",
    rules: [
      {
        id: "rule_healing_transfer",
        rule: "Orin cannot erase an injury. He can only transfer it.",
        consequences: "Saving another person always places an unknown burden somewhere else."
      },
      {
        id: "rule_manifestation",
        rule: "Absorbed wounds eventually acquire physical or psychological form.",
        consequences: "Repeated healing slowly creates new threats within Orin."
      }
    ],
    powerSystem: {
      exists: true,
      name: "Burden Healing",
      summary: "A forbidden healing technique that transfers physical trauma rather than removing it.",
      rules: ["Orin must physically touch the injured person.", "Only an existing injury can be transferred."],
      costs: ["Every transferred wound remains inside Orin in another form."],
      limitations: ["Orin cannot predict what form an absorbed wound will eventually take."]
    },
    factions: [
      {
        id: "faction_wardens",
        name: "The Mercy Wardens",
        description: "Authorities responsible for identifying and suppressing forbidden healing.",
        goals: ["Prevent another healing catastrophe", "Find practitioners of forbidden medicine"]
      }
    ],
    locations: [
      {
        id: "location_border_town",
        name: "Rook's Hollow",
        description: "A battered trade settlement still recovering from the war.",
        narrativePurpose: "The place where Orin's attempt to remain anonymous immediately fails.",
        visualTags: ["rain-dark stone", "temporary clinics", "war damage"]
      }
    ]
  },
  cast: [
    {
      id: "char_orin",
      role: "PROTAGONIST",
      name: "Orin",
      storyFunction: "Embodies the conflict between helping others and destroying himself.",
      summary: "A gifted former healer hiding behind cynicism and cheap work.",
      personalityTraits: ["dry", "observant", "self-sacrificing", "defensive"],
      want: "Prove that he can still save people.",
      need: "Believe he deserves to exist even when he cannot fix everyone.",
      internalConflict: "He resents being used for his gift while measuring his worth by its usefulness.",
      relationshipToProtagonist: "Self",
      visualConcept: "Tired field medic silhouette with repaired travel clothes and wrapped hands.",
      characterSheetSeed: {
        personality: "Dry, tired, perceptive, compassionate despite pretending not to care.",
        backstory: "Once respected as a battlefield healer, Orin became disgraced after an unexplained healing incident.",
        communicationStyle: "Understated, sarcastic, precise during emergencies.",
        relationshipStyle: "Keeps others at a distance but assumes responsibility for their pain.",
        visualDescription: "Weathered fantasy healer with wrapped hands and practical dark travel clothes."
      }
    },
    {
      id: "char_mara",
      role: "ALLY",
      name: "Mara",
      storyFunction: "Challenges Orin's belief that saving someone gives him ownership of their consequences.",
      summary: "A blunt caravan guard who survives because Orin secretly heals a fatal injury.",
      personalityTraits: ["practical", "loyal", "confrontational"],
      want: "Repay a debt Orin insists does not exist.",
      need: "Stop treating relationships as transactions.",
      internalConflict: "She hates owing anyone, yet surviving forces her into the most important debt of her life.",
      relationshipToProtagonist: "Reluctant traveling companion who notices how much healing costs him.",
      visualConcept: "Compact armored traveler with visibly repaired gear.",
      characterSheetSeed: {
        personality: "Blunt, practical, suspicious of sentimentality, deeply loyal once trust is earned.",
        backstory: "A caravan guard whose encounter with Orin changes both their paths.",
        communicationStyle: "Direct and concise.",
        relationshipStyle: "Trust is demonstrated through actions.",
        visualDescription: "Battle-worn caravan guard with repaired light armor and cropped hair."
      }
    },
    {
      id: "char_pip",
      role: "ALLY",
      name: "Pip",
      storyFunction: "Provides humor while creating ethical pressure around Orin's ability.",
      summary: "An opportunistic young apothecary fascinated by impossible healing.",
      personalityTraits: ["curious", "talkative", "resourceful"],
      want: "Understand how Orin's healing works.",
      need: "Learn that understanding someone does not give permission to use them.",
      internalConflict: "Genuine affection and scientific obsession collide.",
      relationshipToProtagonist: "Annoying admirer who becomes indispensable.",
      visualConcept: "Overloaded traveling apothecary with bottles, notes, and stained gloves.",
      characterSheetSeed: {
        personality: "Fast-thinking, curious, funny, intrusive, surprisingly empathetic.",
        backstory: "A young apothecary fascinated by forbidden medicine.",
        communicationStyle: "Rapid questions and enthusiastic theories.",
        relationshipStyle: "Attachment begins as curiosity and grows into loyalty.",
        visualDescription: "Young traveling apothecary with pouches, bottles, notebooks, and expressive face."
      }
    },
    {
      id: "char_sel",
      role: "ANTAGONIST",
      name: "Warden Sel",
      storyFunction: "Represents the strongest rational argument for why Orin should stop healing.",
      summary: "An investigator who believes forbidden healers pose an existential threat.",
      personalityTraits: ["disciplined", "patient", "principled"],
      want: "Find and contain practitioners of forbidden healing.",
      need: "Confront whether preventing catastrophe can justify abandoning people who could be saved.",
      internalConflict: "Her position is supported by real evidence, but enforcing it means accepting preventable suffering.",
      relationshipToProtagonist: "Hunter and ideological counterpoint.",
      visualConcept: "Controlled official silhouette in a pale travel coat.",
      characterSheetSeed: {
        personality: "Calm, disciplined, difficult to provoke.",
        backstory: "A Mercy Warden shaped by direct exposure to uncontrolled healing.",
        communicationStyle: "Measured and formal.",
        relationshipStyle: "Treats Orin as dangerous without treating him as evil.",
        visualDescription: "Severe investigator in a pale weatherproof coat with restrained equipment."
      }
    }
  ],
  relationships: [
    {
      fromCharacterId: "char_orin",
      toCharacterId: "char_mara",
      type: "Reluctant alliance",
      initialState: "Mara feels indebted while Orin wants her to leave.",
      tension: "Mara refuses to let Orin decide alone what suffering he is allowed to absorb.",
      desiredArc: "Obligation becomes mutual trust."
    },
    {
      fromCharacterId: "char_orin",
      toCharacterId: "char_sel",
      type: "Ideological opposition",
      initialState: "Sel considers Orin proof that the banned practice survived.",
      tension: "Both can point to real people who would suffer if the other's worldview wins.",
      desiredArc: "Certainty gives way to uncomfortable understanding."
    }
  ],
  season: {
    format: { episodeLengthSeconds: 75, targetEpisodeCount: 12 },
    seasonQuestion: "Can Orin keep saving people without becoming the thing everyone was right to fear?",
    beginning: "Orin heals Mara and discovers her wound has become something alive inside him.",
    escalation: "The group meets people Orin cannot easily refuse while the creatures become distinct.",
    midpoint: "One wound-creature demonstrates intelligence and reveals knowledge Orin does not possess.",
    crisis: "Someone the group loves requires healing when another transfer may release a creature.",
    finale: "Orin chooses what burden he is willing to carry, then the oldest creature addresses him.",
    characterArcs: [
      {
        characterId: "char_orin",
        startingState: "Believes his worth comes from suffering on behalf of others.",
        endingState: "Begins distinguishing compassion from self-erasure."
      }
    ]
  },
  episodeOne: {
    title: "It Doesn't Disappear",
    purpose: "Demonstrate Orin's forbidden healing and reveal its hidden consequence.",
    hook: "A badly wounded Mara collapses beside Orin while he insists he is not a healer.",
    endingHook: "After Mara walks away healed, something inside Orin opens its eyes.",
    beats: [
      {
        id: "beat_1",
        type: "HOOK",
        summary: "Mara collapses from a wound that will kill her within minutes.",
        involvedCharacterIds: ["char_orin", "char_mara"],
        locationId: "location_border_town",
        storyChange: "Orin must choose between exposure and watching someone die."
      },
      {
        id: "beat_2",
        type: "CONFLICT",
        summary: "Orin tries ordinary treatment and realizes it cannot save her.",
        involvedCharacterIds: ["char_orin", "char_mara"],
        locationId: "location_border_town",
        storyChange: "Remaining an ordinary medic becomes impossible."
      },
      {
        id: "beat_3",
        type: "REVEAL",
        summary: "Orin secretly pulls the wound from Mara into himself.",
        involvedCharacterIds: ["char_orin", "char_mara"],
        locationId: "location_border_town",
        storyChange: "The audience learns Orin possesses forbidden healing."
      },
      {
        id: "beat_4",
        type: "EMOTIONAL",
        summary: "Mara wakes healed while Orin insists she leave before anyone notices.",
        involvedCharacterIds: ["char_orin", "char_mara"],
        locationId: "location_border_town",
        storyChange: "Mara becomes suspicious and unwilling to disappear."
      },
      {
        id: "beat_5",
        type: "CLIFFHANGER",
        summary: "Alone, Orin hears movement beneath his skin and something opens its eyes.",
        involvedCharacterIds: ["char_orin"],
        locationId: "location_border_town",
        storyChange: "Healing is revealed to create rather than erase suffering."
      }
    ]
  },
  canon: {
    facts: [
      {
        id: "fact_transfer",
        subjectType: "CHARACTER",
        subjectId: "char_orin",
        fact: "Orin transfers injuries rather than erasing them.",
        mutable: false
      },
      {
        id: "fact_banned",
        subjectType: "WORLD",
        subjectId: null,
        fact: "The form of healing Orin practices is illegal.",
        mutable: false
      }
    ],
    mysteries: [
      {
        id: "mystery_creatures",
        question: "What are the creatures created by absorbed wounds?",
        answerKnownToCreator: null,
        revealIntent: "Reveal their nature gradually as they become increasingly intelligent."
      }
    ]
  },
  studioFeatures: [
    {
      type: "POWER_SYSTEM",
      reason: "The rules, costs, and limitations of wound transfer directly drive the plot.",
      priority: "PRIMARY"
    },
    {
      type: "RELATIONSHIP_GRAPH",
      reason: "Found-family relationships are a major promise of the series.",
      priority: "PRIMARY"
    },
    {
      type: "CHARACTER_KNOWLEDGE",
      reason: "Different characters discovering Orin's secret at different times creates tension.",
      priority: "SECONDARY"
    },
    {
      type: "ABILITY_TRACKER",
      reason: "The accumulated consequences of each healing event need persistent tracking.",
      priority: "SECONDARY"
    }
  ],
  clarification: {
    needed: true,
    questions: [
      {
        id: "question_sentience",
        question: "Should the wound-creatures eventually become fully sentient people?",
        whyItMatters: "That choice changes the morality of destroying them and Orin's long-term arc.",
        impact: "STORY"
      }
    ]
  },
  confidence: {
    overall: 0.88,
    identity: 0.94,
    world: 0.81,
    cast: 0.84,
    story: 0.91,
    assumptions: [
      "The protagonist is the washed-up healer.",
      "Found-family bonds should develop gradually.",
      "The creatures begin mysterious rather than fully explained."
    ]
  }
};
