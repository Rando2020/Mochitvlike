import type {ActionPattern,AbilityVariant,CharacterAbility,CharacterPerformanceBible,CanonPerformanceContext,MotionChoreographyContext,ProductionFramePerformanceContext,SignatureAction,AbilitySoundIntegration,AbilityVfxSpec} from "./types";
import {getCanonicalAbilityVariant,isAbilityAvailable} from "./canon";

function mergeChoreography(ability:CharacterAbility,variant:AbilityVariant){
 return{
  windup:variant.changes.choreography.windup??ability.choreography.windup,
  activation:variant.changes.choreography.activation??ability.choreography.activation,
  release:variant.changes.choreography.release??ability.choreography.release,
  impact:variant.changes.choreography.impact??ability.choreography.impact,
  recovery:variant.changes.choreography.recovery??ability.choreography.recovery
 };
}
export function materializeAbilityVariant(ability:CharacterAbility,variant:AbilityVariant){
 return{
  choreography:mergeChoreography(ability,variant),
  visualSignature:{...ability.visualSignature,...variant.changes.visualSignature},
  costs:variant.changes.costs.length?variant.changes.costs:ability.rules.costs,
  limitations:variant.changes.limitations.length?variant.changes.limitations:ability.rules.limitations
 };
}
function findAction(bible:CharacterPerformanceBible,id:string):ActionPattern|null{
 const g=bible.actionGuide;
 return[
  ...(g.combatStance?[g.combatStance]:[]),...g.attackVocabulary,...g.defenseVocabulary,...g.dodgeVocabulary,...g.weaponHandling,...g.interactionPatterns
 ].find(a=>a.id===id)??null;
}
function findSignature(bible:CharacterPerformanceBible,id:string):SignatureAction|null{return bible.actionGuide.signatureActions.find(a=>a.id===id)??null;}

export function buildProductionFramePerformanceContext(input:{
 bible:CharacterPerformanceBible;context:CanonPerformanceContext;actionPatternId?:string;signatureActionId?:string;abilityId?:string;
}):ProductionFramePerformanceContext{
 const {bible,context}=input;const actionPattern=input.actionPatternId?findAction(bible,input.actionPatternId):null,signatureAction=input.signatureActionId?findSignature(bible,input.signatureActionId):null;
 let abilityContext:ProductionFramePerformanceContext["ability"]=null;
 if(input.abilityId){
  const ability=bible.abilityKit.find(a=>a.id===input.abilityId);if(!ability||!isAbilityAvailable(ability,context))throw new Error("ABILITY_NOT_AVAILABLE");
  const variant=getCanonicalAbilityVariant(ability,context);if(!variant)throw new Error("ABILITY_VARIANT_NOT_AVAILABLE");
  const effective=materializeAbilityVariant(ability,variant);
  abilityContext={id:ability.id,name:ability.identity.name,variant,activation:ability.activation,choreography:effective.choreography,visualSignature:effective.visualSignature,vfx:ability.vfx,cameraLanguage:ability.cameraLanguage,referenceAssetIds:ability.referenceAssetIds,referenceSheet:ability.referenceSheet};
 }
 return{characterId:bible.characterId,bibleVersion:bible.version,movementIdentity:bible.movementIdentity,actionPattern,signatureAction,ability:abilityContext};
}

export function buildMotionChoreographyContext(input:{bible:CharacterPerformanceBible;context:CanonPerformanceContext;actionPatternId?:string;signatureActionId?:string;abilityId?:string}):MotionChoreographyContext{
 const frame=buildProductionFramePerformanceContext(input);
 if(frame.ability){
  const beats=[...frame.ability.choreography.windup,...frame.ability.choreography.activation,...frame.ability.choreography.release,...frame.ability.choreography.impact,...frame.ability.choreography.recovery];
  return{sourceType:"ABILITY",sourceId:frame.ability.id,startPose:frame.ability.activation.startPose,beats,recoveryPose:null,reusablePoseReferenceIds:[...new Set([frame.ability.activation.startPose.poseReferenceId,...frame.ability.referenceSheet.map(r=>r.assetId)].filter((x):x is string=>!!x))],movementVectors:beats.map(b=>b.movementVector).filter((x):x is string=>!!x),vfxAnchorHints:frame.ability.vfx.emissionAnchors};
 }
 const source=frame.signatureAction??frame.actionPattern;if(!source)throw new Error("PERFORMANCE_SOURCE_REQUIRED");
 return{sourceType:frame.signatureAction?"SIGNATURE_ACTION":"ACTION_PATTERN",sourceId:source.id,startPose:source.startPose,beats:source.beats,recoveryPose:source.recoveryPose,reusablePoseReferenceIds:[...new Set([source.startPose.poseReferenceId,source.recoveryPose?.poseReferenceId,...source.referenceAssetIds].filter((x):x is string=>!!x))],movementVectors:source.beats.map(b=>b.movementVector).filter((x):x is string=>!!x),vfxAnchorHints:[]};
}

export function buildAbilitySoundIntegration(ability:CharacterAbility,context:CanonPerformanceContext):AbilitySoundIntegration{
 if(!isAbilityAvailable(ability,context))throw new Error("ABILITY_NOT_AVAILABLE");
 const variant=getCanonicalAbilityVariant(ability,context);if(!variant)throw new Error("ABILITY_VARIANT_NOT_AVAILABLE");
 return{abilityId:ability.id,variantId:variant.id,...ability.audioSignature};
}

export function buildAbilityVfxIntegration(ability:CharacterAbility,context:CanonPerformanceContext):AbilityVfxSpec{
 if(!isAbilityAvailable(ability,context))throw new Error("ABILITY_NOT_AVAILABLE");
 const variant=getCanonicalAbilityVariant(ability,context);if(!variant)throw new Error("ABILITY_VARIANT_NOT_AVAILABLE");
 const effective=materializeAbilityVariant(ability,variant);
 return{...ability.vfx,energyShape:effective.visualSignature.energyShape,palette:effective.visualSignature.palette,particleMotifs:effective.visualSignature.particleLanguage,impactBehavior:effective.visualSignature.impactLanguage,aftermathBehavior:effective.visualSignature.aftermathLanguage};
}
