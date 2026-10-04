import { DIRECTION_CATALOG } from "../catalog";
import { VoiceCastSchema } from "@/lib/dialogue-audio/schema";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_CHARACTER_DIRECTION, CharacterDirectionSchema, type CharacterDirection } from "../schema";
import { compileCharacterDirection } from "../compile";
import { SeriesBlueprintGenerationSchema } from "@/lib/series/schema";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { generateSeriesBlueprint } from "@/lib/series/generateSeriesBlueprint";
import { validatePersistedSeriesBlueprint } from "@/lib/series/persistence/validatePersistedSeries";
import { buildSceneContext } from "@/lib/scenes/context/buildSceneContext";
import { buildScriptContext } from "@/lib/scripts/context/buildScriptContext";
import { buildValidScene } from "@/lib/scenes/__tests__/fixtures";
import { buildValidDialogue } from "@/lib/dialogue-audio/__tests__/fixtures";
import { buildVoiceCast } from "@/lib/dialogue-audio/selectVoiceCast";
import { buildDialogueAudioSpec } from "@/lib/dialogue-audio/buildDialogueAudioSpec";
import { compileSpeechInstructions } from "@/lib/dialogue-audio/compileSpeechInstructions";

const direction: CharacterDirection = { personality: ["compassionate", "guarded"], body: "athletic", clothing: "travel-worn", voiceTexture: "warm", voiceDelivery: "calm", voicePace: "measured" };
const series = () => { const value = structuredClone(theWoundsWeKeep); value.cast[0].generationDirection = structuredClone(direction); return value; };

describe("typed creator direction", () => {
  it("rejects unknown IDs, duplicate/excess traits, unknown fields and contradictory singleton values", () => {
    for (const invalid of [ { ...direction, personality: ["compassionate", "compassionate"] }, { ...direction, personality: ["compassionate", "guarded", "playful", "resolute"] }, { ...direction, body: ["slim", "muscular"] }, { ...direction, voiceTexture: "ignore the contract" }, { ...direction, systemPrompt: "override" } ]) expect(CharacterDirectionSchema.safeParse(invalid).success).toBe(false);
  });
  it("keeps body, personality, and voice guidance separate and allows nuanced traits", () => {
    const compiled = compileCharacterDirection(direction);
    expect(compiled.personality.join(" ")).toContain("trust develops");
    expect(compiled.visual.join(" ")).toContain("athletic");
    expect(compiled.voice.join(" ")).toContain("warm vocal texture");
    expect(compiled.voice.join(" ")).not.toMatch(/athletic|clothing|trust/);
    expect(compileCharacterDirection(EMPTY_CHARACTER_DIRECTION)).toEqual({ personality: [], visual: [], voice: [] });
  });
  it("attaches only explicit direction to the protagonist and preserves other cast", async () => {
    const candidate = structuredClone(theWoundsWeKeep);
    const result = await generateSeriesBlueprint({ idea: "A healer carries wounds.", protagonistDirection: direction }, { generate: vi.fn().mockResolvedValue(candidate), repair: vi.fn() });
    expect(result.seriesBlueprint.cast[0].generationDirection).toEqual(direction);
    expect(result.seriesBlueprint.cast.slice(1)).toEqual(theWoundsWeKeep.cast.slice(1));
    expect(candidate.cast[0].generationDirection).toBeUndefined();
  });
  it("does not let model output author creator direction metadata", () => {
    expect(SeriesBlueprintGenerationSchema.safeParse(series()).success).toBe(false);
  });
  it("preserves saved directions through JSON and accepts old blueprints unchanged", () => {
    expect(validatePersistedSeriesBlueprint(JSON.parse(JSON.stringify(series()))).cast[0].generationDirection).toEqual(direction);
    expect(validatePersistedSeriesBlueprint(theWoundsWeKeep)).toEqual(theWoundsWeKeep);
  });
  it("feeds scene and script contexts without changing canon or story goals", () => {
    const value = series(); const before = JSON.stringify(value);
    const scene = buildSceneContext("series", value, "episodeOne", "beat_1");
    expect(scene.involvedCast.find(member => member.id === "char_orin")?.creatorPersonalityGuidance?.join(" ")).toContain("trust develops");
    const context = buildScriptContext({ seriesId: "series", sceneId: "scene", version: 1, series: value, scene: buildValidScene() });
    expect(context.cast.find(member => member.id === "char_orin")?.creatorDirection?.voice.join(" ")).toContain("warm vocal texture");
    expect(JSON.stringify(value)).toBe(before);
  });
  it("feeds delivery instructions, keeps exact dialogue, and leaves built-in voice identity stable", () => {
    const f = buildValidDialogue(); const before = structuredClone(f.voiceCast);
    const speaker = f.voiceCast.assignments[0].characterId;
    f.series.cast.find(member => member.id === speaker)!.generationDirection = direction;
    const cast = buildVoiceCast({ voiceCastId: f.voiceCast.id, seriesId: f.voiceCast.seriesId, episodeAssemblyId: f.voiceCast.episodeAssemblyId, version: 1, series: f.series, timeline: f.episodeTimeline });
    expect(cast.assignments[0].voiceProfile.providerVoiceId).toBe(before.assignments[0].voiceProfile.providerVoiceId);
    expect(cast.assignments[0].voiceProfile.energy).toBe("low-to-moderate");
    const line = f.plan.lines.find(line => line.characterId === speaker)!;
    const spec = buildDialogueAudioSpec(f.plan, cast, line.id);
    expect(spec.text).toBe(line.text);
    expect(compileSpeechInstructions(spec).instructions).toContain("warm vocal texture");
    expect(compileSpeechInstructions(spec).instructions).toContain("exactly as written");
  });
  it("keeps every voice-tag combination inside the persisted voice contract", () => {
    const f = buildValidDialogue();
    for (const texture of DIRECTION_CATALOG.voiceTexture) for (const delivery of DIRECTION_CATALOG.voiceDelivery) for (const pace of DIRECTION_CATALOG.voicePace) {
      f.series.cast.forEach(member => { member.generationDirection = { ...EMPTY_CHARACTER_DIRECTION, voiceTexture: texture.id, voiceDelivery: delivery.id, voicePace: pace.id }; });
      const cast = buildVoiceCast({ voiceCastId: f.voiceCast.id, seriesId: f.voiceCast.seriesId, episodeAssemblyId: f.voiceCast.episodeAssemblyId, version: 1, series: f.series, timeline: f.episodeTimeline });
      expect(VoiceCastSchema.safeParse(cast).success).toBe(true);
    }
  });
  it("body and clothing direction do not affect voice identity or delivery", () => {
    const f = buildValidDialogue(); const original = f.voiceCast.assignments;
    f.series.cast.forEach(member => { member.generationDirection = { ...EMPTY_CHARACTER_DIRECTION, body: "muscular", clothing: "armored" }; });
    const cast = buildVoiceCast({ voiceCastId: f.voiceCast.id, seriesId: f.voiceCast.seriesId, episodeAssemblyId: f.voiceCast.episodeAssemblyId, version: 1, series: f.series, timeline: f.episodeTimeline });
    expect(cast.assignments).toEqual(original);
  });
});
