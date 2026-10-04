import { compileCharacterDirection } from "@/lib/character-direction/compile";
import {createHash} from "node:crypto";
import type {SeriesBlueprint} from "@/lib/series/types";
import type {SceneBlueprint} from "@/lib/scenes/types";
import type {SceneScript} from "@/lib/scripts/types";
import type {VisualPlan} from "@/lib/visual-planning/types";
import type {StoryboardBlueprint,StoryboardPanel} from "@/lib/storyboards/types";
import type {VisualFoundationModel} from "@/lib/visual-models/types";
import type {CanonPerformanceContext,CharacterPerformanceBible} from "@/lib/character-performance/types";
import {buildProductionFramePerformanceContext} from "@/lib/character-performance/integration";
import {compileProductionFramePrompt} from "./prompt";
import {requireAbilityReferences} from "./references";
import {requireRevisionBoundCharacterReferences} from "./direction-references";
import type {ProductionAbilityConstraint,ProductionFrameGenerationSpec,ProductionReferenceAsset} from "./types";

export type PerformanceBinding={characterId:string;actionPatternId?:string;signatureActionId?:string;abilityId?:string};
function digest(value:string){return createHash("sha256").update(value).digest("hex");}
function uuidFrom(value:string){
 const h=digest(value).slice(0,32).split("");h[12]="4";h[16]=(["8","9","a","b"] as const)[parseInt(h[16],16)%4];
 return `${h.slice(0,8).join("")}-${h.slice(8,12).join("")}-${h.slice(12,16).join("")}-${h.slice(16,20).join("")}-${h.slice(20).join("")}`;
}
function seedFrom(value:string){return parseInt(digest(value).slice(0,8),16)>>>0;}

export function buildProductionFrameGenerationSpec(input:{
 series:SeriesBlueprint;scene:SceneBlueprint;script:SceneScript;visualPlan:VisualPlan;storyboard:StoryboardBlueprint;panel:StoryboardPanel;
 model:VisualFoundationModel;developmentOverride:boolean;references:readonly ProductionReferenceAsset[];
 performanceBibles:readonly CharacterPerformanceBible[];performanceBindings?:readonly PerformanceBinding[];canonContext:CanonPerformanceContext;
 output?:{width:number;height:number};
}):ProductionFrameGenerationSpec{
 const {series,scene,script,visualPlan,storyboard,panel,model}=input;
 if(scene.seriesId!==storyboard.seriesId||script.sceneId!==scene.id||visualPlan.scriptId!==script.id||storyboard.visualPlanId!==visualPlan.id)throw new Error("PRODUCTION_FRAME_PARENT_MISMATCH");
 if(!storyboard.panels.some(p=>p.id===panel.id))throw new Error("PRODUCTION_FRAME_PANEL_NOT_FOUND");
 const visualBeat=visualPlan.visualBeats.find(b=>b.id===panel.sourceVisualBeatId);if(!visualBeat)throw new Error("PRODUCTION_FRAME_VISUAL_BEAT_NOT_FOUND");
 const allCharacterIds=[...new Set([...visualBeat.focalCharacterIds,...visualBeat.supportingCharacterIds,...panel.characterIds])];
 const boundCharacters=requireRevisionBoundCharacterReferences(series,input.references,allCharacterIds,model.id);
 const characterRefs=boundCharacters.references;
 const providerReferences=input.references.map(({version:_version,...reference})=>reference);
 const cast=new Map(series.cast.map(c=>[c.id,c]));
 const continuity=new Map(visualPlan.continuity.characters.map(c=>[c.characterId,c]));
 const bibleByCharacter=new Map(input.performanceBibles.map(b=>[b.characterId,b]));
 const bindingByCharacter=new Map((input.performanceBindings??[]).map(b=>[b.characterId,b]));
 const contexts=[];const abilities:ProductionAbilityConstraint[]=[];const abilityRefs:ProductionReferenceAsset[]=[];
 for(const characterId of allCharacterIds){
  const binding=bindingByCharacter.get(characterId);if(!binding)continue;
  const bible=bibleByCharacter.get(characterId);if(!bible)throw new Error("CHARACTER_PERFORMANCE_BIBLE_REQUIRED");
  const context=buildProductionFramePerformanceContext({bible,context:input.canonContext,actionPatternId:binding.actionPatternId,signatureActionId:binding.signatureActionId,abilityId:binding.abilityId});
  contexts.push(context);
  if(context.ability){
   const requiredSlots=context.ability.referenceSheet.filter(slot=>slot.required).map(slot=>slot.slot);
   const refs=requireAbilityReferences(providerReferences,context.ability.id,model.id,requiredSlots);abilityRefs.push(...refs);
   const effectiveBeats=[...context.ability.choreography.windup,...context.ability.choreography.activation,...context.ability.choreography.release,...context.ability.choreography.impact,...context.ability.choreography.recovery];
   abilities.push({
    characterId,abilityId:context.ability.id,abilityName:context.ability.name,variantId:context.ability.variant.id,
    activationPose:context.ability.activation.startPose,relevantActionBeats:effectiveBeats,
    visualSignature:{
     palette:context.ability.visualSignature.palette,energyShape:context.ability.visualSignature.energyShape,
     motionLanguage:context.ability.visualSignature.motionLanguage,vfxMotifs:context.ability.visualSignature.vfxMotifs,
     impactLanguage:context.ability.visualSignature.impactLanguage,aftermathLanguage:context.ability.visualSignature.aftermathLanguage
    },
    vfx:context.ability.vfx,cameraLanguage:context.ability.cameraLanguage,
    mustNotDo:[...context.ability.cameraLanguage.avoid],referenceAssetIds:refs.map(r=>r.id)
   });
  }
 }
 const characters=allCharacterIds.map(characterId=>{
  const c=cast.get(characterId);if(!c)throw new Error("PRODUCTION_FRAME_CHARACTER_NOT_FOUND");
  const cont=continuity.get(characterId);
  const bible=bibleByCharacter.get(characterId);
  const visualDirection = c.generationDirection ? compileCharacterDirection(c.generationDirection).visual : [];
  return{characterId,name:c.name,visualConcept:c.visualConcept,visualDescription:c.characterSheetSeed.visualDescription + (visualDirection.length ? "; Creator visual direction: " + visualDirection.join(" ") : ""),
   costumeRequirements:cont?.requiredAppearanceNotes??[],continuityConstraints:cont?.continuityNotes??[],
   performanceBibleVersion:bible?.version??null,referenceAssetIds:characterRefs.filter(r=>r.characterId===characterId).map(r=>r.id)};
 });
 const location=panel.locationId?series.world.locations.find(l=>l.id===panel.locationId)??null:null;
 const canonical=[
  ...boundCharacters.notes,
  `Series visual identity: ${series.creativeDNA.visualStyle.description}`,
  `Color language: ${series.creativeDNA.visualStyle.colorLanguage}`,
  ...characters.flatMap(c=>[`${c.name} identity: ${c.visualConcept}; ${c.visualDescription}`,...c.costumeRequirements.map(x=>`${c.name} appearance: ${x}`),...c.continuityConstraints.map(x=>`${c.name} continuity: ${x}`)]),
  ...panel.continuityRequirements.map(x=>"Panel continuity: "+x),
  ...panel.environmentRequirements.map(x=>"Environment continuity: "+x),
  ...storyboard.continuityChecks.protectedCanon.map(id=>"Protected canon ID: "+id),
  ...storyboard.continuityChecks.protectedMysteries.map(id=>"Protected mystery ID: "+id),
  ...contexts.flatMap(c=>[...c.movementIdentity.physicalPrinciples.map(x=>"Movement principle: "+x),...c.movementIdentity.mustNotDo.map(x=>"Movement must not: "+x)]),
  ...abilities.flatMap(a=>[
   `Ability ${a.abilityName} variant ${a.variantId}: physical activation ${a.activationPose.stance}; hands ${a.activationPose.handPositions.join("; ")}`,
   `Ability palette: ${a.visualSignature.palette.join(", ")}`,`Ability energy shape: ${a.visualSignature.energyShape}`,
   ...a.visualSignature.motionLanguage.map(x=>"Ability motion: "+x),`Ability travel: ${a.vfx.travelBehavior}`,`Ability impact: ${a.vfx.impactBehavior}`,`Ability aftermath: ${a.vfx.aftermathBehavior}`,
   ...a.mustNotDo.map(x=>"Ability must not: "+x)
  ])
 ];
 const variable=[
  `Shot size/framing: ${panel.framingIntent}`,`Camera/composition: ${panel.composition}`,`Staging: ${panel.staging}`,
  `Shot story moment: ${panel.moment}`,`Emotional focus: ${panel.emotionalFocus}`,`Visual beat composition: ${visualBeat.compositionIntent}`,
  `Lighting adjustment within series language: ${series.creativeDNA.visualStyle.lighting}`,
  visualBeat.environmentFocus?`Background composition: ${visualBeat.environmentFocus}`:"Background composition: preserve canonical location continuity."
 ];
 const output=input.output??{width:1536,height:1024};
 const draft:Omit<ProductionFrameGenerationSpec,"promptChecksum">={
  id:uuidFrom(`${storyboard.id}|${panel.id}|v1`),seriesId:storyboard.seriesId,sceneId:storyboard.sceneId,scriptId:storyboard.scriptId,visualPlanId:storyboard.visualPlanId,storyboardId:storyboard.id,storyboardPanelId:panel.id,
  model:{modelId:model.id,revision:model.source.revision,architecture:model.architecture,developmentOverride:input.developmentOverride},
  output:{...output,aspectRatio:`${output.width}:${output.height}`},
  creativeDirection:{visualStyleDescription:series.creativeDNA.visualStyle.description,colorLanguage:series.creativeDNA.visualStyle.colorLanguage,lightingLanguage:series.creativeDNA.visualStyle.lighting,animationLanguage:series.creativeDNA.visualStyle.animationLanguage,cameraLanguage:series.creativeDNA.visualStyle.cameraLanguage},
  composition:{shotSize:panel.framingIntent,cameraAngle:panel.composition,framing:visualBeat.compositionIntent,focalCharacterIds:[...visualBeat.focalCharacterIds],supportingCharacterIds:[...visualBeat.supportingCharacterIds],environment:visualBeat.environmentFocus},
  characters,performance:{characterPerformanceContexts:contexts},abilityConstraints:abilities,
  environment:{locationId:panel.locationId,description:location?.description??scene.location.settingNotes,visualTags:location?.visualTags??[],continuityRequirements:[...panel.environmentRequirements,...visualPlan.continuity.environmentRules]},
  canonicalConstraints:canonical,variableShotDirection:variable,references:[...characterRefs,...abilityRefs],seed:seedFrom(`${storyboard.id}|${panel.id}|${model.id}|${model.source.revision}`),promptVersion:"1.0"
 };
 const compiled=compileProductionFramePrompt(draft);
 return{...draft,promptChecksum:compiled.promptChecksum};
}
