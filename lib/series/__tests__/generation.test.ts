import { describe, expect, it, vi } from "vitest";
import { theWoundsWeKeep } from "../demoBlueprint";
import { generateSeriesBlueprint } from "../generateSeriesBlueprint";
const idea = {idea: "A healer carries the wounds of others."};
const clone = () => structuredClone(theWoundsWeKeep);
describe("validated show generation", () => {
  it("accepts a valid foundation without a repair", async () => {
    const provider = {generate: vi.fn().mockResolvedValue(clone()), repair: vi.fn()};
    expect((await generateSeriesBlueprint(idea, provider)).metadata.source).toBe("llm");
    expect(provider.repair).not.toHaveBeenCalled();
  });
  it("repairs invalid references once", async () => {
    const invalid = clone();invalid.episodeOne.beats[0].involvedCharacterIds = ["unknown"];
    const provider = {generate: vi.fn().mockResolvedValue(invalid), repair: vi.fn().mockResolvedValue(clone())};
    expect((await generateSeriesBlueprint(idea, provider)).metadata.source).toBe("repaired");
    expect(provider.repair).toHaveBeenCalledTimes(1);
  });
  it("fails closed after one failed repair without substituting a demo", async () => {
    const provider = {generate: vi.fn().mockResolvedValue("bad JSON"), repair: vi.fn().mockResolvedValue({})};
    await expect(generateSeriesBlueprint(idea, provider)).rejects.toMatchObject({code:"SERIES_REPAIR_FAILED"});
    expect(provider.repair).toHaveBeenCalledTimes(1);
  });
  it("validates requested format and rejects duplicate canon IDs", async () => {
    const candidate = clone();candidate.canon.facts.push(candidate.canon.facts[0]);
    const provider = {generate: vi.fn().mockResolvedValue(candidate), repair: vi.fn().mockResolvedValue(clone())};
    await expect(generateSeriesBlueprint({...idea,preferences:{episodeLengthSeconds:120,targetEpisodeCount:20}}, provider)).rejects.toMatchObject({code:"SERIES_REPAIR_FAILED"});
  });
  it("does not retry a failed provider call", async () => {
    const provider = {generate: vi.fn().mockRejectedValue(new Error("provider secret")), repair: vi.fn()};
    await expect(generateSeriesBlueprint(idea, provider)).rejects.toMatchObject({code:"SERIES_GENERATION_FAILED"});
    expect(provider.repair).not.toHaveBeenCalled();
  });
  it("rejects oversized input and unknown injection fields before calling the provider", async () => {
    const provider = {generate:vi.fn(),repair:vi.fn()};
    await expect(generateSeriesBlueprint({idea:"x".repeat(5001)},provider)).rejects.toThrow();
    await expect(generateSeriesBlueprint({...idea,ignoreSchema:true} as never,provider)).rejects.toThrow();
    expect(provider.generate).not.toHaveBeenCalled();
  });
});
