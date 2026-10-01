import {z} from "zod";

const text=z.string().trim().min(1).max(1200);
const short=z.string().trim().min(1).max(240);
const id=z.string().trim().min(1).max(160);
const score=z.number().min(0).max(1);

export const ActionPoseSchema=z.object({
 stance:short,facing:short,weightDistribution:short,handPositions:z.array(short).max(12),silhouette:text,poseReferenceId:id.nullable()
}).strict();

export const ActionBeatSchema=z.object({
 id,
 phase:z.enum(["PREPARATION","WINDUP","ACTION","CONTACT","IMPACT","RECOVERY"]),
 description:text,
 body:z.object({
  torso:text.nullable(),head:text.nullable(),leftArm:text.nullable(),rightArm:text.nullable(),leftLeg:text.nullable(),rightLeg:text.nullable(),hands:z.array(short).max(12)
 }).strict(),
 movementVector:text.nullable(),
 intensity:score,
 durationHintSeconds:z.number().positive().max(30).nullable(),
 requiredVisualElements:z.array(short).max(20)
}).strict();

export const CameraGuidanceSchema=z.object({
 shot:short,angle:short,purpose:text,preserve:z.array(short).max(12),avoid:z.array(short).max(12)
}).strict();

export const MovementPatternSchema=z.object({
 name:short,bodyLanguage:z.array(text).min(1).max(16),centerOfGravity:z.enum(["LOW","NEUTRAL","HIGH"]),tempo:z.enum(["STILL","SLOW","MEASURED","FAST","EXPLOSIVE"]),silhouettePrinciples:z.array(text).min(1).max(12),referenceAssetIds:z.array(id).max(20)
}).strict();

export const ActionPatternSchema=z.object({
 id,name:short,purpose:text,startPose:ActionPoseSchema,beats:z.array(ActionBeatSchema).min(1).max(24),recoveryPose:ActionPoseSchema.nullable(),cameraGuidance:z.array(CameraGuidanceSchema).max(12),movementPrinciples:z.array(text).min(1).max(16),mustPreserve:z.array(text).max(16),mustNotDo:z.array(text).max(16),referenceAssetIds:z.array(id).max(24)
}).strict();

export const SignatureActionSchema=ActionPatternSchema.extend({
 category:z.enum(["RITUAL","SOCIAL","PERFORMANCE","SPORTS","COMBAT","OTHER"]),
 storyMeaning:text.nullable()
}).strict();

export const AbilityVfxSpecSchema=z.object({
 energyShape:text,palette:z.array(short).min(1).max(12),emissionAnchors:z.array(short).min(1).max(12),particleMotifs:z.array(short).max(16),distortion:text.nullable(),travelBehavior:text,impactBehavior:text,aftermathBehavior:text
}).strict();

export const AbilityAudioSignatureSchema=z.object({
 activationCue:text.nullable(),releaseCue:text.nullable(),impactCue:text.nullable(),recurringMotif:text.nullable()
}).strict();

export const AbilityReferenceAssetContractSchema=z.object({
 slot:z.enum(["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"]),
 assetKey:id,required:z.boolean(),description:text,assetId:id.nullable()
}).strict();

export const AbilityVariantSchema=z.object({
 id,abilityId:id,name:short,version:z.number().int().min(1),status:z.enum(["ACTIVE","ARCHIVED"]),
 canonicalFrom:z.discriminatedUnion("type",[
  z.object({type:z.literal("EPISODE_NUMBER"),episodeNumber:z.number().int().min(1)}).strict(),
  z.object({type:z.literal("CANON_FACT"),canonFactId:id}).strict()
 ]),
 changes:z.object({
  choreography:z.object({
   windup:z.array(ActionBeatSchema).optional(),activation:z.array(ActionBeatSchema).optional(),release:z.array(ActionBeatSchema).optional(),impact:z.array(ActionBeatSchema).optional(),recovery:z.array(ActionBeatSchema).optional()
  }).strict(),
  visualSignature:z.object({
   silhouette:text.optional(),palette:z.array(short).min(1).max(12).optional(),energyShape:text.optional(),motionLanguage:z.array(text).max(16).optional(),vfxMotifs:z.array(text).max(16).optional(),particleLanguage:z.array(text).max(16).optional(),impactLanguage:text.optional(),aftermathLanguage:text.optional()
  }).strict(),
  costs:z.array(text).max(16),limitations:z.array(text).max(16)
 }).strict(),
 replacesVariantId:id.nullable()
}).strict();

export const CharacterAbilitySchema=z.object({
 id,characterId:id,nature:z.enum(["POWER_SYSTEM","MUNDANE"]),
 identity:z.object({name:short,aliases:z.array(short).max(12),classification:z.enum(["CORE","SIGNATURE","UTILITY","DEFENSIVE","ULTIMATE"])}).strict(),
 concept:z.object({summary:text,storyPurpose:text,emotionalMeaning:text.nullable()}).strict(),
 activation:z.object({
  startPose:ActionPoseSchema,handPositions:z.array(short).max(12),bodyMotion:z.array(text).min(1).max(16),facialExpression:text.nullable(),prerequisiteState:z.array(text).max(12),requiredPropIds:z.array(id).max(12)
 }).strict(),
 choreography:z.object({
  windup:z.array(ActionBeatSchema).max(16),activation:z.array(ActionBeatSchema).min(1).max(16),release:z.array(ActionBeatSchema).max(16),impact:z.array(ActionBeatSchema).max(16),recovery:z.array(ActionBeatSchema).max(16)
 }).strict(),
 visualSignature:z.object({
  silhouette:text,palette:z.array(short).min(1).max(12),energyShape:text,motionLanguage:z.array(text).min(1).max(16),vfxMotifs:z.array(text).max(16),particleLanguage:z.array(text).max(16),impactLanguage:text,aftermathLanguage:text
 }).strict(),
 vfx:AbilityVfxSpecSchema,
 cameraLanguage:z.object({preferredShots:z.array(short).max(12),preferredAngles:z.array(short).max(12),heroMoment:text.nullable(),avoid:z.array(text).max(12)}).strict(),
 audioSignature:AbilityAudioSignatureSchema,
 rules:z.object({costs:z.array(text).max(16),limitations:z.array(text).max(16),prerequisites:z.array(text).max(16),mustNotDo:z.array(text).max(16)}).strict(),
 powerSystemBinding:z.object({systemName:z.string().trim().min(1).max(150).nullable(),refIds:z.array(id).min(1).max(24)}).strict().nullable(),
 continuity:z.object({unlockedAtCanonId:id.nullable(),currentVariantId:id,knownByCharacterIds:z.array(id).max(12)}).strict(),
 referenceAssetIds:z.array(id).max(24),
 referenceSheet:z.array(AbilityReferenceAssetContractSchema).min(1).max(12),
 variants:z.array(AbilityVariantSchema).min(1).max(20)
}).strict();

export const CharacterPerformanceBibleSchema=z.object({
 characterId:id,version:z.number().int().min(1),
 movementIdentity:z.object({
  posture:text,idle:MovementPatternSchema,walk:MovementPatternSchema,run:MovementPatternSchema,
  emotionalMovement:z.array(z.object({emotion:short,pattern:MovementPatternSchema}).strict()).max(16),
  physicalPrinciples:z.array(text).min(1).max(16),mustNotDo:z.array(text).max(16)
 }).strict(),
 actionGuide:z.object({
  combatStance:ActionPatternSchema.nullable(),attackVocabulary:z.array(ActionPatternSchema).max(20),defenseVocabulary:z.array(ActionPatternSchema).max(20),dodgeVocabulary:z.array(ActionPatternSchema).max(20),weaponHandling:z.array(ActionPatternSchema).max(20),interactionPatterns:z.array(ActionPatternSchema).max(20),signatureActions:z.array(SignatureActionSchema).max(20)
 }).strict(),
 abilityKit:z.array(CharacterAbilitySchema).max(24)
}).strict();
