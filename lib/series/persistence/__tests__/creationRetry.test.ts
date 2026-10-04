import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSeriesRecord } from "../createSeries";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
const creationId="11111111-1111-4111-8111-111111111111";
const input={creatorId:"owner",creationId,seriesBlueprint:theWoundsWeKeep,metadata:{source:"llm" as const,schemaVersion:"1.0"}};
function client(existing:unknown){
  const filters=vi.fn();const insert=vi.fn();
  const read={eq:(...args:unknown[])=>{filters(...args);return read;},maybeSingle:async()=>({data:existing,error:null})};
  return {filters,insert,supabase:{from:()=>({insert:(payload:unknown)=>{insert(payload);return {select:()=>({single:async()=>({data:null,error:{code:"23505"}})})};},select:()=>read})} as unknown as SupabaseClient};
}
const existing={id:creationId,title:"The Wounds We Keep",status:"DRAFT",created_at:"now",blueprint:theWoundsWeKeep,blueprint_schema_version:"1.0",generation_source:"llm"};
describe("retry-safe series creation",()=>{
  it("reuses identical content with creator-scoped lookup on the unique ID",async()=>{
    const db=client(existing);expect((await createSeriesRecord(db.supabase,input)).id).toBe(creationId);
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({id:creationId,creator_id:"owner"}));
    expect(db.filters).toHaveBeenCalledWith("creator_id","owner");
  });
  it("does not reuse content belonging to another owner or a hidden row",async()=>{
    await expect(createSeriesRecord(client(null).supabase,input)).rejects.toMatchObject({code:"SERIES_PERSISTENCE_FAILED"});
  });
  it("does not reuse an ID for changed canonical content or metadata",async()=>{
    const changed=structuredClone(theWoundsWeKeep);changed.identity.title="Changed";
    await expect(createSeriesRecord(client(existing).supabase,{...input,seriesBlueprint:changed})).rejects.toMatchObject({code:"SERIES_PERSISTENCE_FAILED"});
    await expect(createSeriesRecord(client(existing).supabase,{...input,metadata:{source:"repaired",schemaVersion:"1.0"}})).rejects.toMatchObject({code:"SERIES_PERSISTENCE_FAILED"});
  });
});
