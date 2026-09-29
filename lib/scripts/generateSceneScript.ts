import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { SceneScriptSchema } from "./schema";
import type { SceneScript, ScriptContext, ScriptGenerationSource } from "./types";
import {
  validateSceneScript,
  type ScriptValidationIssue
} from "./validateSceneScript";

export class ScriptGenerationError extends Error {
  constructor(
    public readonly code:
      | "SCRIPT_GENERATION_FAILED"
      | "SCRIPT_REPAIR_FAILED"
      | "SCRIPT_PROVIDER_UNAVAILABLE",
    message: string
  ) {
    super(message);
    this.name = "ScriptGenerationError";
  }
}

export interface SceneScriptProvider {
  generate(input: {
    scriptId: string;
    context: ScriptContext;
  }): Promise<unknown>;

  repair(input: {
    scriptId: string;
    context: ScriptContext;
    failedObject: unknown;
    validationErrors: ScriptValidationIssue[];
  }): Promise<unknown>;
}

const SCRIPT_JSON_SCHEMA = z.toJSONSchema(SceneScriptSchema);

const INSTRUCTIONS = `
You are the Script Writing Engine for a serialized short-form show studio.

Write the actual dramatic scene from the supplied SceneBlueprint.
Write spoken dialogue and stageable dramatic action.
Do not write camera instructions, shot sizes, lenses, lighting instructions, image prompts, video prompts, audio instructions, voice parameters, or production prompts.

Preserve character knowledge and distinct voice.
Use personality and communication-style context as guidance, not text to copy.
Use subtext and avoid exposition dumps.
Respect every mustNotReveal constraint.
Naturally communicate required mustCommunicate ideas.
Preserve the scene action intent, emotional turn, ending state, and exact required story change.
Do not silently resolve protected mysteries.
Do not invent major lore to improve dialogue.
Keep prose visually stageable and concise enough for the target duration.
Return only the structured SceneScript.
`.trim();

export class OpenAISceneScriptProvider implements SceneScriptProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new ScriptGenerationError("SCRIPT_PROVIDER_UNAVAILABLE", "Script provider is unavailable.");
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_SCRIPT_MODEL ?? "gpt-6-astra";
  }

  private async call(developer: string, payload: unknown) {
    const response = await this.client.responses.create({
      model: this.model,
      input: [
        { role: "developer", content: developer },
        { role: "user", content: JSON.stringify(payload) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "scene_script",
          description: "Versioned dramatic scene script.",
          strict: true,
          schema: SCRIPT_JSON_SCHEMA
        }
      }
    });

    if (!response.output_text) {
      throw new ScriptGenerationError("SCRIPT_GENERATION_FAILED", "Script provider returned no output.");
    }

    try {
      return JSON.parse(response.output_text) as unknown;
    } catch {
      throw new ScriptGenerationError("SCRIPT_GENERATION_FAILED", "Script provider returned malformed output.");
    }
  }

  generate(input: { scriptId: string; context: ScriptContext }) {
    return this.call(INSTRUCTIONS, {
      serverAssignedScriptId: input.scriptId,
      scriptContext: input.context
    });
  }

  repair(input: {
    scriptId: string;
    context: ScriptContext;
    failedObject: unknown;
    validationErrors: ScriptValidationIssue[];
  }) {
    return this.call(
      `${INSTRUCTIONS}

Repair the failed SceneScript exactly once.
Preserve valid dialogue/action choices.
Correct every validation error.
Do not explain the repair.`,
      {
        serverAssignedScriptId: input.scriptId,
        scriptContext: input.context,
        validationErrors: input.validationErrors,
        failedObject: input.failedObject
      }
    );
  }
}

export async function generateSceneScript(
  input: {
    seriesId: string;
    sceneId: string;
    version: number;
    series: SeriesBlueprint;
    scene: SceneBlueprint;
    context: ScriptContext;
  },
  provider?: SceneScriptProvider
): Promise<{ script: SceneScript; source: ScriptGenerationSource }> {
  const scriptId = randomUUID();
  const activeProvider = provider ?? new OpenAISceneScriptProvider();

  let candidate: unknown;
  try {
    candidate = await activeProvider.generate({ scriptId, context: input.context });
  } catch (error) {
    if (error instanceof ScriptGenerationError) throw error;
    throw new ScriptGenerationError("SCRIPT_GENERATION_FAILED", "Script generation failed.");
  }

  const initial = validateSceneScript(candidate, input.series, input.scene, {
    scriptId,
    sceneId: input.sceneId,
    seriesId: input.seriesId,
    version: input.version
  });

  if (initial.success) return { script: initial.script, source: "llm" };

  try {
    const repairedCandidate = await activeProvider.repair({
      scriptId,
      context: input.context,
      failedObject: candidate,
      validationErrors: initial.errors
    });

    const repaired = validateSceneScript(repairedCandidate, input.series, input.scene, {
      scriptId,
      sceneId: input.sceneId,
      seriesId: input.seriesId,
      version: input.version
    });

    if (repaired.success) return { script: repaired.script, source: "repaired" };
  } catch {
    // Exactly one repair attempt.
  }

  throw new ScriptGenerationError("SCRIPT_REPAIR_FAILED", "Script could not be safely validated after one repair.");
}
