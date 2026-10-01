import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";

const read=(p:string)=>readFileSync(resolve(process.cwd(),p),"utf8");
const migration=read("supabase/migrations/20261001220000_production_reference_assets_v1.sql");
const route=read("app/api/series/[seriesId]/production-references/route.ts");
const detail=read("app/api/series/[seriesId]/production-references/[referenceId]/route.ts");
const approve=read("app/api/series/[seriesId]/production-references/[referenceId]/approve/route.ts");
const service=read("lib/production-references/service.ts");
const studio=read("components/production-references/ProductionReferenceStudio.tsx");
const worker=read("lib/production-frames/jobs/processProductionFrameJob.ts");
const compiler=read("lib/production-frames/compiler.ts");

describe("database contract",()=>{
 it("extends existing reference table",()=>expect(migration).toContain("alter table public.production_reference_assets"));
 for(const state of ["UPLOADED","REVIEW_REQUIRED","APPROVED","REJECTED","ARCHIVED"])it("supports "+state,()=>expect(migration).toContain("'"+state+"'"));
 it("creates private bucket",()=>expect(migration).toContain("values ('production-references','production-references',false"));
 it("bounds storage size",()=>expect(migration).toContain("10485760"));
 for(const mime of ["image/png","image/jpeg","image/webp"])it("allows "+mime,()=>expect(migration).toContain(mime));
 it("has primary identity uniqueness",()=>expect(migration).toContain("production_reference_primary_identity_active_idx"));
 it("has ability slot uniqueness",()=>expect(migration).toContain("production_reference_ability_slot_active_idx"));
 it("freezes approved bytes",()=>expect(migration).toContain("APPROVED_REFERENCE_IMMUTABLE"));
 it("freezes checksum",()=>expect(migration).toContain("new.checksum is distinct from old.checksum"));
 it("freezes provenance",()=>expect(migration).toContain("new.provenance is distinct from old.provenance"));
 it("preserves archive history",()=>expect(migration).toContain("archived_at"));
 it("keeps browser writes revoked",()=>expect(migration).toContain("revoke insert,update,delete"));
 it("storage is owner scoped",()=>expect(migration).toContain("(select auth.uid())::text"));
 it("downgrades legacy approvals for review",()=>expect(migration).toContain("set status='REVIEW_REQUIRED', approved=false"));
});

describe("API security contract",()=>{
 it("upload authenticates",()=>expect(route).toContain("supabase.auth.getUser"));
 it("upload loads owned Series",()=>expect(route).toContain("getSeries(supabase,user.id,seriesId)"));
 it("upload uses form data",()=>expect(route).toContain("request.formData"));
 it("upload requires File",()=>expect(route).toContain("file instanceof File"));
 it("upload validates metadata schema",()=>expect(route).toContain("ReferenceMetadataSchema.safeParse"));
 it("upload never returns service key",()=>expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY"));
 it("list authenticates",()=>expect(route).toContain("UNAUTHENTICATED"));
 it("list signs private assets",()=>expect(route).toContain("signedProductionReferenceUrl"));
 it("detail is ownership scoped",()=>expect(detail).toContain("getProductionReferenceRecord(admin,user.id,seriesId,referenceId)"));
 it("detail hides storage path",()=>expect(detail).toContain("storagePath:undefined"));
 it("metadata updates are bounded to non-approved references",()=>expect(detail).toContain('current.status==="APPROVED"'));
 it("metadata update re-evaluates approval problems",()=>expect(detail).toContain("approvalProblems(candidate"));
 it("approval authenticates",()=>expect(approve).toContain("supabase.auth.getUser"));
 it("approval reloads Series",()=>expect(approve).toContain("getSeries"));
 it("approval validates Performance Bibles",()=>expect(approve).toContain("getPerformanceBibles"));
});

describe("service and immutability contract",()=>{
 it("upload creates random reference ID",()=>expect(service).toContain("randomUUID"));
 it("upload computes image inspection",()=>expect(service).toContain("inspectProductionReferenceImage"));
 it("upload uses checksum storage path",()=>expect(service).toContain("uploadProductionReference"));
 it("upload cleans object if DB fails",()=>expect(service).toContain('remove([storage.storagePath])'));
 it("approval checks approvalProblems",()=>expect(service).toContain("approvalProblems(record"));
 it("approval sets creator approval",()=>expect(service).toContain("creator_approved:true"));
 it("archive does not delete row",()=>expect(service).toContain('status:"ARCHIVED"'));
 it("replacement increments prior version",()=>expect(service).toContain("version=replaced.version+1"));
});

describe("creator UX contract",()=>{
 it("shows reference studio title",()=>expect(studio).toContain("Production References"));
 it("shows primary identity role",()=>expect(studio).toContain("PRIMARY_IDENTITY"));
 it("shows pending/approved lifecycle",()=>{expect(studio).toContain("REVIEW_REQUIRED");expect(studio).toContain("Approve");});
 for(const slot of ["ACTIVATION_POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX_ISOLATION","PALETTE","SHAPE_LANGUAGE","MOTION_ARROWS"])it("shows "+slot,()=>expect(studio).toContain(slot));
 it("shows character readiness",()=>expect(studio).toContain("getCharacterProductionReadiness"));
 it("shows ability readiness",()=>expect(studio).toContain("getAbilityProductionReadiness"));
 it("does not expose raw storage path label",()=>expect(studio).not.toContain("storage_path"));
 it("does not expose checksum label",()=>expect(studio).not.toContain("promptChecksum"));
});

describe("Production Frame integration contract",()=>{
 it("compiler requires every ability reference slot",()=>expect(compiler).toContain("requiredSlots=context.ability.referenceSheet.filter"));
 it("worker refreshes signed reference URLs",()=>expect(worker).toContain("materializeRuntimeReferenceUrls"));
 it("worker still validates reference provenance before provider",()=>expect(worker.indexOf("REFERENCE_PROVENANCE_INVALID")).toBeLessThan(worker.indexOf("provider.generate")));
 it("worker still validates checksums before provider",()=>expect(worker.indexOf("SPEC_CHECKSUM_MISMATCH")).toBeLessThan(worker.indexOf("provider.generate")));
});
