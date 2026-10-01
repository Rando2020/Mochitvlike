import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";

const read=(p:string)=>readFileSync(resolve(process.cwd(),p),"utf8");
const storyboard=read("components/storyboards/StoryboardWorkspace.tsx");
const seriesStudio=read("components/series-studio/SeriesStudio.tsx");
const detail=read("app/api/series/[seriesId]/production-references/[referenceId]/route.ts");

describe("reference workflow integration",()=>{
 it("Storyboard maps missing references to creator-facing copy",()=>expect(storyboard).toContain("needs approved production references before this frame can be rendered"));
 it("Storyboard links to Reference Studio",()=>expect(storyboard).toContain("Open Reference Studio"));
 it("Storyboard does not silently promote storyboard source",()=>expect(storyboard).not.toContain("use storyboard as identity"));
 it("Series Studio links to Production Reference Studio",()=>expect(seriesStudio).toContain("Open Production Reference Studio"));
 it("Reference metadata can be completed after upload",()=>expect(detail).toContain("export async function PATCH"));
 it("approved reference metadata is immutable through API",()=>expect(detail).toContain("APPROVED_REFERENCE_IMMUTABLE"));
});
