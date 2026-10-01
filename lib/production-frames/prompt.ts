import {createHash} from "node:crypto";
import type {CompiledProductionFramePrompt,ProductionFrameGenerationSpec} from "./types";

function hash(value:string){return createHash("sha256").update(value).digest("hex");}
export function stableJson(value:unknown){return JSON.stringify(value,(_key,val)=>val&&typeof val==="object"&&!Array.isArray(val)?Object.fromEntries(Object.entries(val).sort(([a],[b])=>a.localeCompare(b))):val);}
export function compileProductionFramePrompt(spec:Omit<ProductionFrameGenerationSpec,"promptChecksum">|ProductionFrameGenerationSpec):CompiledProductionFramePrompt{
 const canonical=[...spec.canonicalConstraints];
 if(spec.abilityConstraints.length)canonical.push("Recurring ability VFX must use its canonical shape, palette, contact geometry, and travel direction; never substitute generic lightning, a ranged projectile, or an outward explosion.");
 const shot=[...spec.variableShotDirection];
 const prompt=[
  "CANONICAL PRODUCTION CONSTRAINTS — these are authoritative and may not be overridden by shot direction:",
  ...canonical.map(x=>"- "+x),
  "SHOT DIRECTION — vary only within the canonical constraints:",
  ...shot.map(x=>"- "+x),
  "Render one original serialized production frame. Preserve identity, continuity, physical staging, and canonical ability behavior. No text, subtitles, logos, watermarks, UI, franchise characters, or celebrity likeness."
 ].join("\n");
 return{prompt,promptVersion:"1.0",promptChecksum:hash(prompt)};
}
export function productionFrameSpecChecksum(spec:ProductionFrameGenerationSpec){
 const normalized={...spec,promptChecksum:undefined};
 return hash(stableJson(normalized));
}
