import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import type {ActionBeat,ActionPattern,ActionPose,CharacterPerformanceBible,MovementPattern,SignatureAction} from "../types";
import {createActionBeatId,stablePerformanceId} from "../id";
import {buildPowerSystemReferences} from "../powerSystem";
import {buildAbilityReferenceSheetContract} from "../referenceSheet";

function pose(stance:string,facing:string,weightDistribution:string,hands:string[],silhouette:string,poseReferenceId:string|null=null):ActionPose{
 return{stance,facing,weightDistribution,handPositions:hands,silhouette,poseReferenceId};
}
function beat(scope:string,index:number,phase:ActionBeat["phase"],description:string,body:Partial<ActionBeat["body"]>,movementVector:string|null,intensity:number,durationHintSeconds:number|null,requiredVisualElements:string[]):ActionBeat{
 return{
  id:createActionBeatId(scope,phase,index,description),phase,description,
  body:{torso:null,head:null,leftArm:null,rightArm:null,leftLeg:null,rightLeg:null,hands:[],...body},
  movementVector,intensity,durationHintSeconds,requiredVisualElements
 };
}
function movement(name:string,bodyLanguage:string[],centerOfGravity:MovementPattern["centerOfGravity"],tempo:MovementPattern["tempo"],silhouettePrinciples:string[]):MovementPattern{
 return{name,bodyLanguage,centerOfGravity,tempo,silhouettePrinciples,referenceAssetIds:[]};
}
function action(idSeed:string,name:string,purpose:string,startPose:ActionPose,beats:ActionBeat[],recoveryPose:ActionPose|null,movementPrinciples:string[]):ActionPattern{
 return{id:stablePerformanceId("action",idSeed),name,purpose,startPose,beats,recoveryPose,cameraGuidance:[{shot:"medium or medium-full",angle:"eye-level unless story requires otherwise",purpose:"Keep the body mechanics readable.",preserve:["hands","weight shift","character silhouette"],avoid:["hiding both hands during the defining action"]}],movementPrinciples,mustPreserve:["Orin remains economical rather than flashy."],mustNotDo:["Acrobatic movement unsupported by his grounded healer identity."],referenceAssetIds:[]};
}

export function buildOrinPerformanceBible():CharacterPerformanceBible{
 const series=theWoundsWeKeep,powerRefs=buildPowerSystemReferences(series);
 const guarded=pose("narrow guarded stance","toward immediate threat","weight slightly back over the rear foot",["open lead hand","rear hand near wrapped ribs"],"compact tired medic silhouette with elbows close");
 const neutral=pose("upright but tired","toward the person he is treating","balanced with a slight forward lean",["hands visible and ready"],"contained practical silhouette");
 const attack=action("orin-short-check","Short Elbow Check","Create space without turning Orin into a dedicated striker.",guarded,[beat("orin-short-check",0,"ACTION","Orin shifts weight forward and drives a compact elbow across the centerline.",{torso:"small forward rotation",rightArm:"elbow remains tight to the body",leftArm:"lead hand protects his center"}, "short forward diagonal",.55,.35,["tight elbow silhouette","grounded feet"])],guarded,["Minimal windup","Close-range defensive efficiency"]);
 const defense=action("orin-palm-redirect","Open-Palm Redirect","Deflect an incoming limb or weapon line while keeping his hands available for treatment.",guarded,[beat("orin-palm-redirect",0,"CONTACT","The lead palm meets the incoming line and redirects it past Orin's shoulder.",{leftArm:"open palm intercepts then guides outward",torso:"small rotation away from force"}, "outside arc",.45,.3,["open palm","clear redirected line"])],guarded,["Redirect rather than overpower","Keep shoulders compact"]);
 const dodge=action("orin-half-slip","Half-Step Slip","Avoid danger with the smallest movement necessary.",guarded,[beat("orin-half-slip",0,"ACTION","Orin withdraws one half-step and turns his torso just outside the attack.",{torso:"small angled turn",leftLeg:"short retreat step",rightLeg:"stays planted until balance transfers"}, "short backward diagonal",.35,.25,["small economical displacement"])],guarded,["No flourish","Return immediately to a usable stance"]);
 const triage=action("orin-triage-check","Three-Point Triage","Orin's practiced assessment ritual before he commits to treatment.",neutral,[
  beat("orin-triage-check",0,"PREPARATION","He stills his own breathing before touching the patient.",{head:"eyes track breathing and bleeding",hands:["hands hover without contact"]},null,.2,.35,["brief stillness"]),
  beat("orin-triage-check",1,"ACTION","Two fingers find the pulse while the other hand checks the wound edge.",{leftArm:"fingers settle at pulse point",rightArm:"hand frames the injury without pressing"},null,.3,.6,["two-point hand separation"]),
  beat("orin-triage-check",2,"RECOVERY","He withdraws both hands together and decides.",{hands:["hands return close to his own body"]},null,.2,.25,["synchronized withdrawal"])
 ],neutral,["Clinical precision","No unnecessary touch"]);
 const wrapBase=action("orin-three-knot-wrap","Three-Knot Field Wrap","A non-supernatural field-dressing ritual that identifies Orin even when no magic is used.",neutral,[
  beat("orin-three-knot-wrap",0,"ACTION","Orin anchors the bandage with one flat turn.",{hands:["left hand stabilizes the dressing","right hand pulls the wrap taut"]},"clockwise wrap",.3,.7,["flat first turn"]),
  beat("orin-three-knot-wrap",1,"ACTION","He crosses the second turn diagonally to lock pressure.",{hands:["hands cross briefly over the injury"]},"diagonal cross",.35,.7,["visible diagonal crossing"]),
  beat("orin-three-knot-wrap",2,"RECOVERY","He finishes with a compact third knot and taps it once to test tension.",{hands:["small third knot","single tension-check tap"]},null,.25,.5,["three-knot finish","single tap"])
 ],neutral,["Fast practiced hands","Same three-step rhythm under stress"]) as SignatureAction;
 const wrap:SignatureAction={...wrapBase,category:"RITUAL",storyMeaning:"Shows that Orin's identity as a healer exists independently of his forbidden gift."};

 const abilityId=stablePerformanceId("ability","orin-burden-draw");
 const v1=stablePerformanceId("variant","orin-burden-draw-v1"),v2=stablePerformanceId("variant","orin-burden-draw-v2");
 const activationPose=pose("kneeling or braced beside the injured person","toward the injury","weight committed through the contact arm",["one wrapped hand makes direct contact","free hand braces near Orin's sternum"],"one grounded contact line connecting healer and patient","pose_orin_burden_draw_activation");
 const baseChoreography={
  windup:[beat("burden-draw-base",0,"WINDUP","Orin settles the wrapped contact hand over the existing injury and locks his shoulders.",{rightArm:"contact arm straightens only enough to establish full palm contact",leftArm:"free hand braces near sternum",torso:"leans toward contact"}, "toward patient",.45,.6,["wrapped contact hand","visible injury location"])],
  activation:[beat("burden-draw-base",1,"ACTION","The wound's vivid color compresses toward the point under Orin's palm.",{rightArm:"contact remains fixed",head:"eyes stay on the patient"}, "patient to contact hand",.65,.8,["color compression","stable hand contact"])],
  release:[beat("burden-draw-base",2,"CONTACT","The injury vanishes from the patient as the same burden traces beneath Orin's wrapped arm.",{rightArm:"arm tenses but does not fling outward",torso:"absorbs a small recoil"}, "contact hand toward Orin",.8,.5,["transfer line","patient wound visibly reduced"])],
  impact:[beat("burden-draw-base",3,"IMPACT","Orin's body takes the cost: his breath catches and a contained unnatural pulse moves under the wrapping.",{torso:"brief inward contraction",head:"chin drops",hands:["contact hand begins to release"]}, "inward toward Orin",.75,.45,["contained under-skin pulse","no outward attack blast"])],
  recovery:[beat("burden-draw-base",4,"RECOVERY","He removes contact slowly and hides the affected hand close to his body.",{rightArm:"withdraws close to torso",torso:"returns to guarded posture"}, "back toward self",.35,.65,["slow contact break","protected wrapped hand"])]
 };
 const referenceSheet=buildAbilityReferenceSheetContract(abilityId);
 const ability={
  id:abilityId,characterId:"char_orin",nature:"POWER_SYSTEM" as const,
  identity:{name:"Burden Draw",aliases:["The Transfer"],classification:"SIGNATURE" as const},
  concept:{summary:"Orin transfers an existing injury from another person into himself rather than erasing it.",storyPurpose:"Turn healing into a visually recognizable sacrifice with an accumulating cost.",emotionalMeaning:"Helping someone always means choosing to carry what they cannot."},
  activation:{startPose:activationPose,handPositions:["one wrapped palm directly contacts the injury","free hand braces near Orin's sternum"],bodyMotion:["grounded forward lean","contact arm stays controlled","recoil collapses inward rather than outward"],facialExpression:"focused restraint that breaks into a brief involuntary wince",prerequisiteState:["An existing injury is present.","Orin can make physical contact."],requiredPropIds:[]},
  choreography:baseChoreography,
  visualSignature:{silhouette:"A single grounded contact line between Orin and the injured person; the effect collapses inward toward him.",palette:["muted wound-crimson","unnatural violet edge","brief pale-white compression"],energyShape:"compressed organic rings that narrow into the contact point rather than a projectile",motionLanguage:["inward pull","concentric compression","short contained recoil"],vfxMotifs:["thin organic rings","brief subdermal pulse"],particleLanguage:["few inward-moving flecks","no explosive outward shower"],impactLanguage:"The patient's wound closes as Orin physically absorbs a contained recoil.",aftermathLanguage:"A brief unnatural trace moves beneath Orin's wrapping and fades."},
  vfx:{energyShape:"compressed organic rings narrowing into the contact point",palette:["muted wound-crimson","unnatural violet edge","pale-white compression"],emissionAnchors:["patient injury","Orin contact palm","Orin wrapped forearm"],particleMotifs:["inward flecks","thin organic rings"],distortion:"subtle local refraction around the contact hand",travelBehavior:"all visible energy travels from the existing injury toward Orin; never away as a projectile",impactBehavior:"patient injury reduces at the same moment Orin takes a compact inward recoil",aftermathBehavior:"subdermal pulse beneath Orin's wrapping, then rapid fade"},
  cameraLanguage:{preferredShots:["two-shot showing both patient injury and Orin contact hand","medium close-up preserving hand-to-injury geography"],preferredAngles:["profile two-shot","high three-quarter angle when hand geography must be explicit"],heroMoment:"Hold the instant the wound disappears from the patient and appears as a contained trace beneath Orin's wrapping.",avoid:["angles that hide the contact hand","framing that makes the technique look like a projectile attack"]},
  audioSignature:{activationCue:"soft low suction-like tonal pull under a restrained heartbeat",releaseCue:"brief compressed inward transient",impactCue:"muted body thump with no explosive tail",recurringMotif:"distorted heartbeat synchronized with the transfer"},
  rules:{costs:["The transferred wound remains inside Orin in another form."],limitations:["Only an existing injury can be transferred.","Orin cannot predict what form the burden may eventually take."],prerequisites:["Physical contact with the injured person."],mustNotDo:["Create a new injury.","Project healing energy at range.","Erase the cost rather than transferring it."]},
  powerSystemBinding:{systemName:series.world.powerSystem.name,refIds:powerRefs.map(r=>r.id)},
  continuity:{unlockedAtCanonId:"fact_transfer",currentVariantId:v2,knownByCharacterIds:["char_orin","char_mara"]},
  referenceAssetIds:[],
  referenceSheet,
  variants:[
   {id:v1,abilityId,name:"Burden Draw: Field Method",version:1,status:"ARCHIVED" as const,canonicalFrom:{type:"EPISODE_NUMBER" as const,episodeNumber:1},changes:{choreography:{},visualSignature:{},costs:[],limitations:[]},replacesVariantId:null},
   {id:v2,abilityId,name:"Burden Draw: Controlled Transfer",version:2,status:"ACTIVE" as const,canonicalFrom:{type:"EPISODE_NUMBER" as const,episodeNumber:6},changes:{choreography:{windup:[beat("burden-draw-v2",0,"WINDUP","Orin establishes contact with less hesitation, setting his shoulder before the transfer starts.",{rightArm:"contact hand settles immediately",leftArm:"free hand braces lower at the ribs",torso:"smaller forward lean"},"toward patient",.5,.4,["same contact silhouette","shorter windup"])]},visualSignature:{motionLanguage:["faster inward pull","tighter concentric compression","smaller recoil"]},costs:[],limitations:[]},replacesVariantId:v1}
  ]
 };
 return{
  characterId:"char_orin",version:1,
  movementIdentity:{
   posture:"Slightly guarded and tired, shoulders contained, hands kept close enough to protect or treat.",
   idle:movement("Tired Stillness",["weight settles more on one leg","wrapped hands remain visible but protected"],"NEUTRAL","STILL",["compact shoulders","hands close to torso"]),
   walk:movement("Medic's Walk",["short efficient steps","eyes scan people and exits before scenery"],"NEUTRAL","MEASURED",["little arm swing","forward attention"]),
   run:movement("Emergency Run",["direct line","arms stay compact","no flourish on turns"],"LOW","FAST",["forward lean","compact elbows"]),
   emotionalMovement:[{emotion:"fear",pattern:movement("Contained Fear",["movement gets smaller rather than larger","free hand protects wrapped hand"],"LOW","STILL",["closed chest","hands pulled inward"])},{emotion:"compassion",pattern:movement("Clinical Softening",["shoulders lower","hands move slowly into view before touch"],"NEUTRAL","SLOW",["open palms","less guarded shoulders"])}],
   physicalPrinciples:["Economy over flourish.","Medical hand precision remains visible under stress.","Emotional strain contracts his movement before it expands it."],
   mustNotDo:["Swaggering heroic poses unsupported by the scene.","Large acrobatic flourishes as a default movement language."]
  },
  actionGuide:{combatStance:action("orin-combat-stance","Guarded Medic Stance","Keep Orin survivable while preserving access to both hands.",guarded,[beat("orin-combat-stance",0,"PREPARATION","Orin squares only enough to protect his center while keeping both hands usable.",{torso:"slightly angled",hands:["lead hand open","rear hand protected"]},null,.25,null,["both hands readable"])],guarded,["Compact guard","Hands remain usable"]),attackVocabulary:[attack],defenseVocabulary:[defense],dodgeVocabulary:[dodge],weaponHandling:[],interactionPatterns:[triage],signatureActions:[wrap]},
  abilityKit:[ability]
 };
}
