import {describe,it} from "vitest";
import {buildVisualBenchmarkBridgeBundle} from "../benchmarkBridge";

describe("visual benchmark bridge bootstrap",()=>{
  it("emits the canonical bridge bundle for one-time checked-in generation",()=>{
    const bundle=buildVisualBenchmarkBridgeBundle();
    console.log("MOCHI_BRIDGE_JSON="+JSON.stringify(bundle));
  });
});
