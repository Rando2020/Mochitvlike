import {render,screen,fireEvent} from "@testing-library/react";
import {describe,expect,it} from "vitest";
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
 it("renders pending primary identity",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[ref()]}/>);expect(screen.getByText("REFERENCE REVIEW REQUIRED")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Approve"})).toBeInTheDocument();});
 it("renders approved character readiness",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[ref({status:"APPROVED",approved:true,creatorApproved:true})]}/>);expect(screen.getAllByText("READY").length).toBeGreaterThan(0);});
 it("renders missing ability slots",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[ref({status:"APPROVED",approved:true,creatorApproved:true})]}/>);expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);});
 it("shows all nine ability slots",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[]}/>);for(const label of ["ACTIVATION POSE","WINDUP","RELEASE","IMPACT","AFTERMATH","VFX ISOLATION","PALETTE","SHAPE LANGUAGE","MOTION ARROWS"])expect(screen.getByText(label)).toBeInTheDocument();});
 it("switches characters",()=>{render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[]}/>);fireEvent.click(screen.getByRole("button",{name:/Mara/}));expect(screen.getByRole("heading",{name:"Mara"})).toBeInTheDocument();});
 it("does not render database internals",()=>{const {container}=render(<ProductionReferenceStudio seriesId="s" blueprint={theWoundsWeKeep} bibles={[bible]} initialReferences={[]}/>);expect(container.textContent).not.toContain("storage_path");expect(container.textContent).not.toContain("creator_approved");});
});
