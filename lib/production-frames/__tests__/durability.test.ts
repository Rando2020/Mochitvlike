import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";

const migration=readFileSync(resolve(process.cwd(),"supabase/migrations/20261001190000_create_production_frames.sql"),"utf8");
const worker=readFileSync(resolve(process.cwd(),"lib/production-frames/jobs/processProductionFrameJob.ts"),"utf8");
const statusRoute=readFileSync(resolve(process.cwd(),"app/api/series/[seriesId]/scenes/[sceneId]/scripts/[scriptId]/visual-plans/[planId]/storyboards/[storyboardId]/panels/[panelId]/production-frame/[frameId]/route.ts"),"utf8");

describe("production frame durability contract",()=>{
 it("creates production_frames",()=>expect(migration).toContain("create table if not exists public.production_frames"));
 it("creates generation history",()=>expect(migration).toContain("create table if not exists public.production_frame_generations"));
 it("enforces panel version uniqueness",()=>expect(migration).toContain("unique(storyboard_panel_id,version)"));
 it("has PENDING generation status",()=>expect(migration).toContain("'PENDING'"));
 it("has SUPERSEDED generation status",()=>expect(migration).toContain("'SUPERSEDED'"));
 it("creates atomic frame+generation RPC",()=>expect(migration).toContain("create_production_frame_with_generation"));
 it("claims before worker provider work",()=>expect(migration).toContain("claim_next_production_frame_generation"));
 it("uses FOR UPDATE SKIP LOCKED",()=>expect(migration.toLowerCase()).toContain("for update skip locked"));
 it("uses claim tokens",()=>expect(migration).toContain("claim_token"));
 it("uses leases",()=>expect(migration).toContain("lease_expires_at"));
 it("uses heartbeat",()=>expect(migration).toContain("heartbeat_at"));
 it("renews lease",()=>expect(migration).toContain("renew_production_frame_generation_lease"));
 it("rejects stale completion through claim token",()=>expect(migration).toContain("status='GENERATING' and claim_token=p_claim_token"));
 it("has bounded retry",()=>expect(migration).toContain("retry_count<3"));
 it("completed generation becomes selected generation",()=>expect(migration).toContain("selected_generation_id=p_job_id"));
 it("creates production frame bucket",()=>expect(migration).toContain("'production-frames'"));
 it("browser clients have no write grant",()=>expect(migration).toContain("revoke insert,update,delete"));
 it("reference registry is read-only to clients",()=>expect(migration).toContain("production_reference_assets"));
 it("benchmark refs cannot be approved by schema check",()=>expect(migration).toContain("not benchmark_only or approved = false"));
});

describe("worker safety contract",()=>{
 it("checks stored claim before provider",()=>expect(worker.indexOf('job.status!=="GENERATING"')).toBeLessThan(worker.indexOf("provider.generate")));
 it("verifies spec checksum before provider",()=>expect(worker.indexOf("SPEC_CHECKSUM_MISMATCH")).toBeLessThan(worker.indexOf("provider.generate")));
 it("verifies prompt checksum before provider",()=>expect(worker.indexOf("PROMPT_CHECKSUM_MISMATCH")).toBeLessThan(worker.indexOf("provider.generate")));
 it("verifies model revision before provider",()=>expect(worker.indexOf("MODEL_REVISION_MISMATCH")).toBeLessThan(worker.indexOf("provider.generate")));
 it("verifies reference provenance before provider",()=>expect(worker.indexOf("REFERENCE_PROVENANCE_INVALID")).toBeLessThan(worker.indexOf("provider.generate")));
 it("heartbeats while provider works",()=>expect(worker).toContain("renew_production_frame_generation_lease"));
 it("uses attempt-specific upload",()=>expect(worker).toContain("attemptId:job.attempt_id"));
 it("removes stale upload",()=>expect(worker).toContain("removeProductionFrame"));
 it("sanitizes provider failures",()=>expect(worker).toContain("INTERNAL_TRANSIENT"));
});

describe("safe status API",()=>{
 it("does not expose claim token",()=>expect(statusRoute).not.toContain("claim_token"));
 it("does not expose lease",()=>expect(statusRoute).not.toContain("lease_expires_at"));
 it("does not expose provider token",()=>expect(statusRoute).not.toContain("VISUAL_INFERENCE_TOKEN"));
 it("returns development warning",()=>expect(statusRoute).toContain("Development Visual"));
 it("returns retry capability",()=>expect(statusRoute).toContain("canRetry"));
});
