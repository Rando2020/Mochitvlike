import type {SeriesBlueprint} from "@/lib/series/types";
import {stablePerformanceId} from "./id";

export type PowerSystemReference={id:string;kind:"RULE"|"COST"|"LIMITATION";index:number;text:string};

export function buildPowerSystemReferences(series:SeriesBlueprint):PowerSystemReference[]{
 if(!series.world.powerSystem.exists)return[];
 const p=series.world.powerSystem;
 return[
  ...p.rules.map((text,index)=>({id:stablePerformanceId("power_rule",index+"|"+text),kind:"RULE" as const,index,text})),
  ...p.costs.map((text,index)=>({id:stablePerformanceId("power_cost",index+"|"+text),kind:"COST" as const,index,text})),
  ...p.limitations.map((text,index)=>({id:stablePerformanceId("power_limit",index+"|"+text),kind:"LIMITATION" as const,index,text}))
 ];
}
