import {createHash} from "node:crypto";
function hex(seed:string){return createHash("sha256").update(seed,"utf8").digest("hex");}
export function stablePerformanceId(prefix:string,seed:string){
 const h=hex(prefix+"|"+seed).slice(0,20);
 return prefix+"_"+h;
}
export function createActionBeatId(scope:string,phase:string,index:number,description:string){
 return stablePerformanceId("beat",scope+"|"+phase+"|"+index+"|"+description);
}
export function createReferenceAssetKey(abilityId:string,slot:string){
 return stablePerformanceId("abilityref",abilityId+"|"+slot);
}
export function deterministicScenarioSeed(id:string){
 return Number.parseInt(hex("scenario|"+id).slice(0,8),16)>>>0;
}
