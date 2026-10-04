import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import type { SeriesBlueprint } from "@/lib/series/types";
import { SceneBlueprintSchema } from "./schema";
import type { SceneBlueprint, SceneContext, SceneGenerationSource } from "./types";
import {
  validateSceneBlueprint,
  type SceneValidationIssue
} from "./validateSceneBlueprint";

export class SceneGenerationError extends Error {
  constructor(
    public readonly code:
      | "SCENE_GENERATION_FAILED"
      | "SCENE_REPAIR_FAILED"
      | "SCENE_PROVIDER_UNAVAILABLE",
    message: string
  ) {
    super(message);
    this.name = "SceneGenerationError";
  }
}

export interface SceneBlueprintProvider {
  generate(input: {
    sceneId: string;
    context: SceneContext;
  }): Promise<unknown>;

  repair(input: {
    sceneId: string;
    context: SceneContext;
    failedObject: unknown;
    validationErrors: SceneValidationIssue[];
  }): Promise<unknown>;
}

const SCENE_JSON_SCHEMA = z.toJSONSchema(SceneBlueprintSchema);

const INSTRUCTIONS = `
You are the Scene Development Engine for a serialized AI show studio.

Plan one dramatic scene. Do not write final dialogue, final choreography, image prompts, video prompts, or production prompts.

Preserve the source beat. The exact required story change must occur.
Enter the scene late and leave once the dramatic change has happened.
Create conflict rather than exposition dumps.
Respect character wants, needs, established knowledge, world rules, power costs, canon facts, and unresolved mysteries.
Never give characters information they have not learned.
Use dialogueIntent to describe objectives/subtext, not dialogue lines.
Use actionIntent to describe necessary story action, not shot-by-shot choreography.
Proposed canon changes are proposals only. Never rewrite or mutate supplied canon.
Do not resolve season-scale mysteries unless the source beat genuinely requires it.
Do not change immutable canon.
Keep the plan feasible for a short-form episode.
Return only the structured SceneBlueprint.
`.trim();

export class OpenAISceneBlueprintProvider implements SceneBlueprintProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const model = process.env.OPENAI_SCENE_MODEL;
    if (!process.env.OPENAI_API_KEY || !model) {
      throw new SceneGenerationError(
        "SCENE_PROVIDER_UNAVAILABLE",
        "Scene generation provider is unavailable."
      );
    }

    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 0 });
    this.model = model;
  }

  private async call(developer: string, payload: unknown) {
    const response = await this.client.responses.create({
      model: this.model,
      max_output_tokens: 10000,
      input: [
        { role: "developer", content: developer },
        { role: "user", content: JSON.stringify(payload) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "scene_blueprint",
          description: "Continuity-aware scene-development plan.",
          strict: true,
          schema: SCENE_JSON_SCHEMA
        }
      }
    });

    if (!response.output_text) {
      throw new SceneGenerationError(
        "SCENE_GENERATION_FAILED",
        "Scene provider returned no structured scene."
      );
    }

    try {
      return JSON.parse(response.output_text) as unknown;
    } catch {
      throw new SceneGenerationError(
        "SCENE_GENERATION_FAILED",
        "Scene provider returned malformed structured output."
      );
    }
  }

  generate(input: { sceneId: string; context: SceneContext }) {
    return this.call(INSTRUCTIONS, {
      serverAssignedSceneId: input.sceneId,
      sceneContext: input.context
    });
  }

  repair(input: {
    sceneId: string;
    context: SceneContext;
    failedObject: unknown;
    validationErrors: SceneValidationIssue[];
  }) {
    return this.call(
      `${INSTRUCTIONS}

Repair the failed SceneBlueprint exactly once.
Preserve all valid creative choices.
Correct every listed validation error.
Do not explain the repair.`,
      {
        serverAssignedSceneId: input.sceneId,
        sceneContext: input.context,
        validationErrors: input.validationErrors,
        failedObject: input.failedObject
      }
    );
  }
}

export async function generateSceneBlueprint(
  input: {
    seriesId: string;
    beatId: string;
    seriesBlueprint: SeriesBlueprint;
    context: SceneContext;
  },
  provider?: SceneBlueprintProvider
): Promise<{
  scene: SceneBlueprint;
  source: SceneGenerationSource;
}> {
  const sceneId = randomUUID();

  let activeProvider = provider;
  if (!activeProvider) {
    activeProvider = new OpenAISceneBlueprintProvider();
  }

  let candidate: unknown;

  try {
    candidate = await activeProvider.generate({
      sceneId,
      context: input.context
    });
  } catch (error) {
    if (error instanceof SceneGenerationError) throw error;
    throw new SceneGenerationError("SCENE_GENERATION_FAILED", "Scene generation failed.");
  }

  const initial = validateSceneBlueprint(candidate, input.seriesBlueprint, {
    sceneId,
    seriesId: input.seriesId,
    beatId: input.beatId
  });

  if (initial.success) {
    return { scene: initial.scene, source: "llm" };
  }

  try {
    const repairedCandidate = await activeProvider.repair({
      sceneId,
      context: input.context,
      failedObject: candidate,
      validationErrors: initial.errors
    });

    const repaired = validateSceneBlueprint(repairedCandidate, input.seriesBlueprint, {
      sceneId,
      seriesId: input.seriesId,
      beatId: input.beatId
    });

    if (repaired.success) {
      return { scene: repaired.scene, source: "repaired" };
    }
  } catch {
    // One repair attempt only.
  }

  throw new SceneGenerationError(
    "SCENE_REPAIR_FAILED",
    "Scene could not be safely validated after one repair."
  );
}
