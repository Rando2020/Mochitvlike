export type CenterOfGravity="LOW"|"NEUTRAL"|"HIGH";
export type MovementTempo="STILL"|"SLOW"|"MEASURED"|"FAST"|"EXPLOSIVE";
export type ActionPhase="PREPARATION"|"WINDUP"|"ACTION"|"CONTACT"|"IMPACT"|"RECOVERY";
export type AbilityClassification="CORE"|"SIGNATURE"|"UTILITY"|"DEFENSIVE"|"ULTIMATE";
export type AbilityNature="POWER_SYSTEM"|"MUNDANE";
export type SignatureActionCategory="RITUAL"|"SOCIAL"|"PERFORMANCE"|"SPORTS"|"COMBAT"|"OTHER";
export type ReferenceSheetSlot="ACTIVATION_POSE"|"WINDUP"|"RELEASE"|"IMPACT"|"AFTERMATH"|"VFX_ISOLATION"|"PALETTE"|"SHAPE_LANGUAGE"|"MOTION_ARROWS";

export type ActionPose={
  stance:string;
  facing:string;
  weightDistribution:string;
  handPositions:string[];
  silhouette:string;
  poseReferenceId:string|null;
};

export type ActionBeat={
  id:string;
  phase:ActionPhase;
  description:string;
  body:{
    torso:string|null;
    head:string|null;
    leftArm:string|null;
    rightArm:string|null;
    leftLeg:string|null;
    rightLeg:string|null;
    hands:string[];
  };
  movementVector:string|null;
  intensity:number;
  durationHintSeconds:number|null;
  requiredVisualElements:string[];
};

export type CameraGuidance={
  shot:string;
  angle:string;
  purpose:string;
  preserve:string[];
  avoid:string[];
};

export type MovementPattern={
  name:string;
  bodyLanguage:string[];
  centerOfGravity:CenterOfGravity;
  tempo:MovementTempo;
  silhouettePrinciples:string[];
  referenceAssetIds:string[];
};

export type ActionPattern={
  id:string;
  name:string;
  purpose:string;
  startPose:ActionPose;
  beats:ActionBeat[];
  recoveryPose:ActionPose|null;
  cameraGuidance:CameraGuidance[];
  movementPrinciples:string[];
  mustPreserve:string[];
  mustNotDo:string[];
  referenceAssetIds:string[];
};

export type SignatureAction=ActionPattern&{
  category:SignatureActionCategory;
  storyMeaning:string|null;
};

export type AbilityVfxSpec={
  energyShape:string;
  palette:string[];
  emissionAnchors:string[];
  particleMotifs:string[];
  distortion:string|null;
  travelBehavior:string;
  impactBehavior:string;
  aftermathBehavior:string;
};

export type AbilityAudioSignature={
  activationCue:string|null;
  releaseCue:string|null;
  impactCue:string|null;
  recurringMotif:string|null;
};

export type AbilityReferenceAssetContract={
  slot:ReferenceSheetSlot;
  assetKey:string;
  required:boolean;
  description:string;
  assetId:string|null;
};

export type AbilityVariantActivation=
  |{type:"EPISODE_NUMBER";episodeNumber:number}
  |{type:"CANON_FACT";canonFactId:string};

export type AbilityVariant={
  id:string;
  abilityId:string;
  name:string;
  version:number;
  status:"ACTIVE"|"ARCHIVED";
  canonicalFrom:AbilityVariantActivation;
  changes:{
    choreography:Partial<CharacterAbility["choreography"]>;
    visualSignature:Partial<CharacterAbility["visualSignature"]>;
    costs:string[];
    limitations:string[];
  };
  replacesVariantId:string|null;
};

export type PowerSystemBinding={
  systemName:string|null;
  refIds:string[];
};

export type CharacterAbility={
  id:string;
  characterId:string;
  nature:AbilityNature;
  identity:{
    name:string;
    aliases:string[];
    classification:AbilityClassification;
  };
  concept:{
    summary:string;
    storyPurpose:string;
    emotionalMeaning:string|null;
  };
  activation:{
    startPose:ActionPose;
    handPositions:string[];
    bodyMotion:string[];
    facialExpression:string|null;
    prerequisiteState:string[];
    requiredPropIds:string[];
  };
  choreography:{
    windup:ActionBeat[];
    activation:ActionBeat[];
    release:ActionBeat[];
    impact:ActionBeat[];
    recovery:ActionBeat[];
  };
  visualSignature:{
    silhouette:string;
    palette:string[];
    energyShape:string;
    motionLanguage:string[];
    vfxMotifs:string[];
    particleLanguage:string[];
    impactLanguage:string;
    aftermathLanguage:string;
  };
  vfx:AbilityVfxSpec;
  cameraLanguage:{
    preferredShots:string[];
    preferredAngles:string[];
    heroMoment:string|null;
    avoid:string[];
  };
  audioSignature:AbilityAudioSignature;
  rules:{
    costs:string[];
    limitations:string[];
    prerequisites:string[];
    mustNotDo:string[];
  };
  powerSystemBinding:PowerSystemBinding|null;
  continuity:{
    unlockedAtCanonId:string|null;
    currentVariantId:string;
    knownByCharacterIds:string[];
  };
  referenceAssetIds:string[];
  referenceSheet:AbilityReferenceAssetContract[];
  variants:AbilityVariant[];
};

export type CharacterPerformanceBible={
  characterId:string;
  version:number;
  movementIdentity:{
    posture:string;
    idle:MovementPattern;
    walk:MovementPattern;
    run:MovementPattern;
    emotionalMovement:Array<{emotion:string;pattern:MovementPattern}>;
    physicalPrinciples:string[];
    mustNotDo:string[];
  };
  actionGuide:{
    combatStance:ActionPattern|null;
    attackVocabulary:ActionPattern[];
    defenseVocabulary:ActionPattern[];
    dodgeVocabulary:ActionPattern[];
    weaponHandling:ActionPattern[];
    interactionPatterns:ActionPattern[];
    signatureActions:SignatureAction[];
  };
  abilityKit:CharacterAbility[];
};

export type CanonPerformanceContext={
  episodeNumber:number;
  activeCanonFactIds:string[];
};

export type ProductionFramePerformanceContext={
  characterId:string;
  bibleVersion:number;
  movementIdentity:CharacterPerformanceBible["movementIdentity"];
  actionPattern:ActionPattern|null;
  signatureAction:SignatureAction|null;
  ability:{
    id:string;
    name:string;
    variant:AbilityVariant;
    activation:CharacterAbility["activation"];
    choreography:CharacterAbility["choreography"];
    visualSignature:CharacterAbility["visualSignature"];
    vfx:AbilityVfxSpec;
    cameraLanguage:CharacterAbility["cameraLanguage"];
    referenceAssetIds:string[];
    referenceSheet:AbilityReferenceAssetContract[];
  }|null;
};

export type MotionChoreographyContext={
  sourceType:"ACTION_PATTERN"|"SIGNATURE_ACTION"|"ABILITY";
  sourceId:string;
  startPose:ActionPose;
  beats:ActionBeat[];
  recoveryPose:ActionPose|null;
  reusablePoseReferenceIds:string[];
  movementVectors:string[];
  vfxAnchorHints:string[];
};

export type AbilitySoundIntegration={
  abilityId:string;
  variantId:string;
  activationCue:string|null;
  releaseCue:string|null;
  impactCue:string|null;
  recurringMotif:string|null;
};

export type AbilityConsistencyScenario={
  id:string;
  category:"ABILITY_CONSISTENCY";
  characterId:string;
  abilityId:string;
  variantId:string;
  title:string;
  cameraAngle:string;
  lighting:string;
  withCharacterIds:string[];
  episodeNumber:number;
  promptContract:{
    mustPreserve:string[];
    mayVary:string[];
    referenceAssetKeys:string[];
  };
  seed:number;
};
