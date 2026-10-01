import type {SeriesBlueprint} from "@/lib/series/types";
import type {ActionPattern,CharacterPerformanceBible,SignatureAction} from "./types";
import {CharacterPerformanceBibleSchema} from "./schema";
import {buildPowerSystemReferences} from "./powerSystem";
import {createReferenceAssetKey} from "./id";
import {REQUIRED_REFERENCE_SLOTS} from "./referenceSheet";

function allActions(bible:CharacterPerformanceBible):(ActionPattern|SignatureAction)[]{
 const g=bible.actionGuide;
 return[
  ...(g.combatStance?[g.combatStance]:[]),...g.attackVocabulary,...g.defenseVocabulary,...g.dodgeVocabulary,...g.weaponHandling,...g.interactionPatterns,...g.signatureActions
 ];
}
function duplicateValues(values:string[]){const seen=new Set<string>(),dupes=new Set<string>();for(const value of values){if(seen.has(value))dupes.add(value);seen.add(value);}return[...dupes];}

export function validateCharacterPerformanceBible(series:SeriesBlueprint,value:unknown){
 const parsed=CharacterPerformanceBibleSchema.safeParse(value);
 if(!parsed.success)return{success:false as const,problems:parsed.error.issues.map(i=>i.path.join(".")+": "+i.message)};
 const bible=parsed.data as CharacterPerformanceBible,problems:string[]=[];
 const castIds=new Set(series.cast.map(c=>c.id)),canonIds=new Set(series.canon.facts.map(f=>f.id));
 if(!castIds.has(bible.characterId))problems.push("CharacterPerformanceBible characterId does not exist in Series cast.");

 const actions=allActions(bible),actionIds=actions.map(a=>a.id);
 for(const d of duplicateValues(actionIds))problems.push("Duplicate action id: "+d);
 const beatIds=actions.flatMap(a=>a.beats.map(b=>b.id));
 for(const ability of bible.abilityKit)beatIds.push(...Object.values(ability.choreography).flat().map(b=>b.id),...ability.variants.flatMap(v=>Object.values(v.changes.choreography).flatMap(x=>x??[]).map(b=>b.id)));
 for(const d of duplicateValues(beatIds))problems.push("Duplicate action beat id: "+d);

 const abilityIds=bible.abilityKit.map(a=>a.id);
 for(const d of duplicateValues(abilityIds))problems.push("Duplicate ability id: "+d);

 const allVariantIds=bible.abilityKit.flatMap(a=>a.variants.map(v=>v.id));
 for(const d of duplicateValues(allVariantIds))problems.push("Duplicate variant id: "+d);

 const powerRefs=new Set(buildPowerSystemReferences(series).map(r=>r.id));
 for(const ability of bible.abilityKit){
  if(ability.characterId!==bible.characterId)problems.push("Ability "+ability.id+" references a different character.");
  if(ability.continuity.unlockedAtCanonId&&!canonIds.has(ability.continuity.unlockedAtCanonId))problems.push("Ability "+ability.id+" has invalid canon unlock reference.");
  for(const id of ability.continuity.knownByCharacterIds)if(!castIds.has(id))problems.push("Ability "+ability.id+" knownByCharacterIds contains unknown character "+id+".");

  const variants=new Map(ability.variants.map(v=>[v.id,v]));
  if(!variants.has(ability.continuity.currentVariantId))problems.push("Ability "+ability.id+" currentVariantId does not belong to the ability.");
  const versions=ability.variants.map(v=>v.version);
  if(new Set(versions).size!==versions.length)problems.push("Ability "+ability.id+" has duplicate variant versions.");
  for(const variant of ability.variants){
   if(variant.abilityId!==ability.id)problems.push("Variant "+variant.id+" belongs to the wrong ability.");
   if(variant.canonicalFrom.type==="CANON_FACT"&&!canonIds.has(variant.canonicalFrom.canonFactId))problems.push("Variant "+variant.id+" has invalid canon activation reference.");
   if(variant.replacesVariantId){
    const replaced=variants.get(variant.replacesVariantId);
    if(!replaced)problems.push("Variant "+variant.id+" replaces an unknown variant.");
    else if(replaced.version>=variant.version)problems.push("Variant "+variant.id+" must replace an earlier version.");
   }
  }
  const maxVersion=Math.max(...ability.variants.map(v=>v.version));
  const current=variants.get(ability.continuity.currentVariantId);
  if(current&&current.version!==maxVersion)problems.push("Ability "+ability.id+" currentVariantId must point to the highest defined version.");

  if(ability.nature==="POWER_SYSTEM"){
   if(!series.world.powerSystem.exists)problems.push("Power-system ability "+ability.id+" requires a Series power system.");
   if(!ability.powerSystemBinding)problems.push("Power-system ability "+ability.id+" requires powerSystemBinding.");
   else{
    if(ability.powerSystemBinding.systemName!==series.world.powerSystem.name)problems.push("Ability "+ability.id+" power-system name does not match SeriesBlueprint.");
    for(const ref of ability.powerSystemBinding.refIds)if(!powerRefs.has(ref))problems.push("Ability "+ability.id+" has invalid power-system reference "+ref+".");
   }
  }else if(ability.powerSystemBinding)problems.push("Mundane ability "+ability.id+" must not bind to a supernatural power system.");

  const slots=ability.referenceSheet.map(x=>x.slot);
  for(const slot of REQUIRED_REFERENCE_SLOTS)if(!slots.includes(slot))problems.push("Ability "+ability.id+" reference sheet missing "+slot+".");
  for(const d of duplicateValues(slots))problems.push("Ability "+ability.id+" reference sheet duplicates "+d+".");
  for(const ref of ability.referenceSheet)if(ref.assetKey!==createReferenceAssetKey(ability.id,ref.slot))problems.push("Ability "+ability.id+" has non-deterministic reference asset key for "+ref.slot+".");
 }
 return problems.length?{success:false as const,problems}:{success:true as const,bible};
}
