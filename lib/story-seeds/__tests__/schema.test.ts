import { describe, expect, it } from "vitest";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { lockedSeedChanges, validateStorySeeds, StoryPlanSaveSchema, type StorySeed } from "../schema";

const seed: StorySeed = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "A turning point",
  characterId: "char_orin",
  type: "REVEAL",
  placement: "MIDPOINT",
  locked: true,
  setup: "A clue appears",
  consequence: "Trust breaks",
  payoff: "The audience feels betrayed"
};
describe("Story Seed validation", () => {
  it("accepts a valid owner-authored seed", () => {
    expect(validateStorySeeds([seed], theWoundsWeKeep)).toHaveLength(1);
  });
  it("rejects unknown cast, repeated IDs and unknown payload keys", () => {
    expect(() => validateStorySeeds([{ ...seed, characterId: "foreign" }], theWoundsWeKeep)).toThrow();
    expect(() => validateStorySeeds([seed, seed], theWoundsWeKeep)).toThrow();
    expect(() => StoryPlanSaveSchema.parse({
      requestId: "22222222-2222-4222-8222-222222222222", expectedRevision: 0, acknowledgeLockedChanges: false,
      seeds: [{ ...seed, creatorId: "spoof" }]
    })).toThrow();
  });
  it("requires review before altering or removing previously locked moments", () => {
    expect(lockedSeedChanges([seed], [seed])).toBe(false);
    expect(lockedSeedChanges([seed], [{ ...seed, title: "Different" }])).toBe(true);
    expect(lockedSeedChanges([seed], [])).toBe(true);
    expect(lockedSeedChanges([{ ...seed, locked: false }], [])).toBe(false);
  });
  it("rejects oversized or malformed seed content", () => {
    expect(() => validateStorySeeds([{ ...seed, title: "" }], theWoundsWeKeep)).toThrow();
    expect(() => validateStorySeeds([{ ...seed, payoff: "x".repeat(601) }], theWoundsWeKeep)).toThrow();
    expect(() => validateStorySeeds(Array(61).fill(seed), theWoundsWeKeep)).toThrow();
  });
});
