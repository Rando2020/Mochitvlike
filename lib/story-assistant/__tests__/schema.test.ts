import { describe, expect, it } from "vitest";
import { StoryAssistantRequestSchema, StorySuggestionsSchema } from "../schema";
import { fixtureSuggestions } from "./fixtures";
const valid = { prompt: "Help earn this turning point", selectedBeatIds: ["beat-1"], expectedSnapshot: "a".repeat(64) };
describe("story assistant contract", () => {
  it("accepts bounded creator requests but rejects private context injection fields", () => {
    expect(StoryAssistantRequestSchema.parse(valid).prompt).toBe("Help earn this turning point");
    expect(StoryAssistantRequestSchema.safeParse({ ...valid, blueprint: {} }).success).toBe(false);
    expect(StoryAssistantRequestSchema.safeParse({ ...valid, mode: "fan" }).success).toBe(false);
    expect(StoryAssistantRequestSchema.safeParse({ ...valid, prompt: "x".repeat(2001) }).success).toBe(false);
    expect(StoryAssistantRequestSchema.safeParse({ ...valid, selectedBeatIds: ["beat-1", "beat-1"] }).success).toBe(false);
  });
  it("requires explanations, setup, consequences and alternatives, without write operations", () => {
    const suggestion = fixtureSuggestions()[0];
    expect(StorySuggestionsSchema.parse([suggestion])).toHaveLength(1);
    expect(StorySuggestionsSchema.safeParse([{ ...suggestion, alternative: undefined }]).success).toBe(false);
    expect(StorySuggestionsSchema.safeParse([{ ...suggestion, sourceIds: [] }]).success).toBe(false);
    expect(StorySuggestionsSchema.safeParse([{ ...suggestion, apply: true }]).success).toBe(false);
    expect(StorySuggestionsSchema.safeParse(Array.from({ length: 4 }, () => suggestion)).success).toBe(false);
  });
});
