import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildSceneContext } from "../context/buildSceneContext";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { OpenAISceneBlueprintProvider } from "../generateSceneBlueprint";

const mocks = vi.hoisted(() => ({ create: vi.fn(), constructor: vi.fn() }));
vi.mock("openai", () => ({ default: class {
  responses = { create: mocks.create };
  constructor(options: unknown) { mocks.constructor(options); }
} }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("OPENAI_API_KEY", "test-only-key"); });
afterEach(() => vi.unstubAllEnvs());

it("fails closed before creating a client if the scene model is missing", () => {
  vi.stubEnv("OPENAI_SCENE_MODEL", "");
  vi.stubEnv("OPENAI_SERIES_MODEL", "show-only-model");
  expect(() => new OpenAISceneBlueprintProvider()).toThrowError(expect.objectContaining({ code: "SCENE_PROVIDER_UNAVAILABLE" }));
  expect(mocks.constructor).not.toHaveBeenCalled();
});

it("uses the explicit scene model with bounded SDK attempts and output", async () => {
  vi.stubEnv("OPENAI_SCENE_MODEL", "configured-scene-model");
  mocks.create.mockResolvedValue({ output_text: "{}" });
  const provider = new OpenAISceneBlueprintProvider();
  const input = { sceneId: "11111111-1111-4111-8111-111111111111", context: buildSceneContext("22222222-2222-4222-8222-222222222222", theWoundsWeKeep, "episodeOne", "beat_1") };
  await provider.generate(input);
  expect(mocks.constructor).toHaveBeenCalledWith({ apiKey: "test-only-key", timeout: 120000, maxRetries: 0 });
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "configured-scene-model", max_output_tokens: 10000 }));
  mocks.create.mockRejectedValue(new Error("provider failure"));
  await expect(provider.generate(input)).rejects.toThrow("provider failure");
  expect(mocks.create).toHaveBeenCalledTimes(2);
});
