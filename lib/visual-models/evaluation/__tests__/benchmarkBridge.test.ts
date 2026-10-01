import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";
import {buildVisualBenchmarkBridgeBundle} from "../benchmarkBridge";

const committed=JSON.parse(readFileSync(resolve(process.cwd(),"ml/visual-evaluation/contracts/benchmark.v1.json"),"utf8"));
const current=buildVisualBenchmarkBridgeBundle();

describe("visual benchmark bridge",()=>{
  it("keeps committed JSON synchronized with TypeScript source",()=>expect(committed).toEqual(current));
  it("uses an explicit schema version",()=>expect(current.schemaVersion).toBe("visual-benchmark-bundle-v1"));
  it("exports three pinned models",()=>expect(current.models).toHaveLength(3));
  it("never exports revision main",()=>expect(current.models.every(m=>m.source.revision!=="main")).toBe(true));
  it("exports at least 30 serialized-production scenarios",()=>expect(current.scenarios.length).toBeGreaterThanOrEqual(30));
  it("exports Orin performance conditioning",()=>expect(current.performance.characterId).toBe("char_orin"));
  it("exports Burden Draw",()=>expect(current.performance.ability.name).toBe("Burden Draw"));
  it("exports six ability consistency scenarios",()=>expect(current.abilityScenarios).toHaveLength(6));
  it("exports a deterministic contract checksum",()=>expect(current.contractChecksum).toHaveLength(64));
});
