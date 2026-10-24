import {render,screen,fireEvent,within} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {theWoundsWeKeep} from "@/lib/series/demoBlueprint";
import {buildOrinPerformanceBible} from "@/lib/character-performance/__tests__/fixtures";
import type {ProductionReferenceRecord} from "@/lib/production-references/types";
import {ProductionReferenceStudio} from "./ProductionReferenceStudio";

const bible=buildOrinPerformanceBible();
const ref=(overrides:Partial<ProductionReferenceRecord>={}):ProductionReferenceRecord=>({
 id:"11111111-1111-4111-8111-111111111111",seriesId:"22222222-2222-4222-8222-222222222222",type:"CHARACTER",status:"REVIEW_REQUIRED",source:"OWNED",
 storagePath:"",assetUrl:"https://example.com/ref.png",checksum:"a".repeat(64),benchmarkOnly:false,creatorApproved:false,approved:false,
 characterId:"char_orin",abilityId:null,locationId:null,propId:null,referenceRole:"PRIMARY_IDENTITY",abilitySlot:null,modelCompatibility:[],
 provenance:{source:"OWNED",creatorNameOrId:"creator",licenseIdOrDescription:"owned",sourceUrlOrRecord:null,permissions:{productionUse:true,commercialUse:true,modelConditioning:true,redistribution:false},projectSpecific:null,notes:null},
 visualMetadata:{width:100,height:100,mimeType:"image/png",notes:null},version:1,replacesReferenceId:null,createdAt:"2026-10-01",updatedAt:"2026-10-01",archivedAt:null,...overrides
});

describe("ProductionReferenceStudio",()=>{
 it("renders pending primary identity",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[ref()]}/>);expect(screen.getAllByText("REFERENCE REVIEW REQUIRED").length).toBeGreaterThan(0);expect(screen.getByRole("button",{name:"Approve"})).toBeInTheDocument();});
 it("renders approved character readiness",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[ref({status:"APPROVED",approved:true,creatorApproved:true})]}/>);expect(screen.getAllByText("READY").length).toBeGreaterThan(0);});
 it("renders missing ability slots",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[ref({status:"APPROVED",approved:true,creatorApproved:true})]}/>);expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);});
 it("shows all nine ability slots",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[]}/>);for(const label of ["ACTIVATION POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX ISOLATION","PALETTE","SHAPE LANGUAGE","MOTION ARROWS"])expect(screen.getAllByText(label).length).toBeGreaterThan(0);});
 it("switches characters",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[]}/>);fireEvent.click(screen.getByRole("button",{name:/Mara/}));expect(screen.getByRole("heading",{name:"Mara"})).toBeInTheDocument();});
 it("does not render database internals",()=>{const {container}=render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[]}/>);expect(container.textContent).not.toContain("storage_path");expect(container.textContent).not.toContain("creator_approved");});
});

 it("allows review-only uploads without falsely attesting production or commercial rights",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[]} initialReferences={[]}/>);const rights=screen.getByRole("group",{name:"Character reference rights"});for(const label of ["I attest production use rights","I attest commercial use rights","I attest model-conditioning rights"]){const checkbox=within(rights).getByRole("checkbox",{name:label});expect(checkbox).not.toBeRequired();expect(checkbox).not.toBeChecked();}expect(screen.getByText(/Unchecked rights stay unknown/)).toBeInTheDocument();});

afterEach(() => vi.unstubAllGlobals());
it("takes an unknown-rights upload through explicit review before separately offering approval", async () => {
 const uploaded=ref({status:"UPLOADED",provenance:{...ref().provenance,creatorNameOrId:null,licenseIdOrDescription:null,permissions:{productionUse:null,commercialUse:null,modelConditioning:null,redistribution:null}}});
 const reviewed=ref({updatedAt:"2026-10-02",provenance:{...ref().provenance,permissions:{productionUse:true,commercialUse:true,modelConditioning:true,redistribution:null}}});
 const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({reference:{id:uploaded.id,status:"REVIEW_REQUIRED"}})}).mockResolvedValueOnce({ok:true,json:async()=>({references:[reviewed]})});
 vi.stubGlobal("fetch",fetcher);
 render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[]} initialReferences={[uploaded]}/>);
 expect(screen.queryByRole("button",{name:"Approve"})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Review rights"}));
 const editor=within(screen.getByRole("form",{name:"Review reference rights"}));
 fireEvent.change(editor.getByLabelText("Creator / rights holder"),{target:{value:"Fixture artist"}});
 fireEvent.change(editor.getByLabelText("License or rights record"),{target:{value:"Fixture rights"}});
 for(const label of ["Production use","Commercial use","Model conditioning"])fireEvent.change(editor.getByLabelText(label),{target:{value:"allowed"}});
 fireEvent.click(editor.getByRole("checkbox"));
 fireEvent.click(editor.getByRole("button",{name:"Save rights for review"}));
 await screen.findByRole("button",{name:"Approve"});
 expect(fetcher).toHaveBeenCalledTimes(2);
 expect(fetcher.mock.calls[0][0]).toMatch(/\/rights$/);
 expect(fetcher.mock.calls[0][1].method).toBe("PATCH");
 expect(fetcher.mock.calls.some(([url])=>url.includes("/approve")||url.includes("/generate")||url.includes("reference-binding"))).toBe(false);
 expect(screen.queryByRole("form",{name:"Review reference rights"})).not.toBeInTheDocument();
});
it("discards an open rights form when switching characters",()=>{
 const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
 render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[]} initialReferences={[ref()]}/>);
 fireEvent.click(screen.getByRole("button",{name:"Review rights"}));
 fireEvent.click(screen.getByRole("button",{name:/Mara/}));
 expect(screen.queryByRole("form",{name:"Review reference rights"})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:/Orin/}));
 expect(screen.queryByRole("form",{name:"Review reference rights"})).not.toBeInTheDocument();
 expect(fetcher).not.toHaveBeenCalled();
});
