import type {AbilityReferenceAssetContract,CharacterAbility,ReferenceSheetSlot} from "./types";
import {createReferenceAssetKey} from "./id";

const DESCRIPTIONS:Record<ReferenceSheetSlot,string>={
 ACTIVATION_POSE:"Canonical full-body activation pose and hand placement.",
 WINDUP:"Readable windup silhouette immediately before activation.",
 RELEASE:"Canonical release pose and direction of force or effect.",
 IMPACT:"Impact-state reference showing the ability's stable contact language.",
 AFTERMATH:"Post-use visual residue and recovery state.",
 VFX_ISOLATION:"Ability VFX isolated from character/background for shape reference.",
 PALETTE:"Canonical ability color swatches with relative emphasis.",
 SHAPE_LANGUAGE:"Canonical energy, symbol, particle, and silhouette shape language.",
 MOTION_ARROWS:"Directional motion guide for body, effect travel, and impact."
};
export const REQUIRED_REFERENCE_SLOTS:readonly ReferenceSheetSlot[]=[
 "ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"
] as const;

export function buildAbilityReferenceSheetContract(abilityId:string):AbilityReferenceAssetContract[]{
 return REQUIRED_REFERENCE_SLOTS.map(slot=>({
  slot,assetKey:createReferenceAssetKey(abilityId,slot),required:true,description:DESCRIPTIONS[slot],assetId:null
 }));
}
export function referenceSheetIsComplete(ability:CharacterAbility){
 return ability.referenceSheet.filter(x=>x.required).every(x=>!!x.assetId);
}
