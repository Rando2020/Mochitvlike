import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SceneScript } from "@/lib/scripts/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { VisualPlanSchema } from "./schema";
import type {
  VisualPlan,
  VisualPlanGenerationSource,
  VisualPlanningContext
} from "./types";
import {
  validateVisualPlan,
  type VisualPlanValidationIssue
} from "./validateVisualPlan";

export class VisualPlanGenerationError extends Error {
  constructor(
    public readonly code:
      | "VISUAL_PLAN_GENERATION_FAILED"
      | "VISUAL_PLAN_REPAIR_FAILED"
      | "VISUAL_PLAN_PROVIDER_UNAVAILABLE",
    message: string
  ) {
    super(message);
    this.name = "VisualPlanGenerationError";
  }
}

export interface VisualPlanProvider {
  generate(input: { planId: string; context: VisualPlanningContext }): Promise<unknown>;
  repair(input: {
    planId: string;
    context: VisualPlanningContext;
    failedObject: unknown;
    validationErrors: VisualPlanValidationIssue[];
  }): Promise<unknown>;
}

const JSON_SCHEMA = z.toJSONSchema(VisualPlanSchema);

const INSTRUCTIONS = `
You are the Visual Planning Engine for a serialized animation/show studio.

Translate a validated scene script into visual pre-production planning only.
Do not generate images, storyboards, keyframes, video, render prompts, model/provider settings, seeds, negative prompts, or asset-generation instructions.

Preserve the SceneScript exactly. Do not rewrite dialogue or action.
Preserve SceneBlueprint story purpose, emotional turn, ending state, location, world rules, power-system limits, mysteries, and canon.
Inherit the Series Creative DNA rather than inventing a new art direction.
Use staging, composition intent, readable geography, reactions, visual contrast, holds, and motion intentionally.
Avoid generic anime framing.
Avoid impossible character teleportation.
Every meaningful script block must be traceable through sourceScriptBlockIds.
A visual beat is a storytelling unit, not necessarily one camera shot.
Keep total visual-beat duration within approximately 20 percent of script duration.
Return only the structured VisualPlan.
`.trim();

export class OpenAIVisualPlanProvider implements VisualPlanProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new VisualPlanGenerationError("VISUAL_PLAN_PROVIDER_UNAVAILABLE", "Visual planning provider is unavailable.");
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_VISUAL_PLAN_MODEL ?? "gpt-6-astra";
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
          name: "visual_plan",
          description: "Visual storytelling pre-production plan.",
          strict: true,
          schema: JSON_SCHEMA
        }
      }
    });

    if (!response.output_text) {
      throw new VisualPlanGenerationError("VISUAL_PLAN_GENERATION_FAILED", "Provider returned no visual plan.");
    }

    try {
      return JSON.parse(response.output_text) as unknown;
    } catch {
      throw new VisualPlanGenerationError("VISUAL_PLAN_GENERATION_FAILED", "Provider returned malformed visual plan.");
    }
  }

  generate(input: { planId: string; context: VisualPlanningContext }) {
    return this.call(INSTRUCTIONS, {
      serverAssignedPlanId: input.planId,
      visualPlanningContext: input.context
    });
  }

  repair(input: {
    planId: string;
    context: VisualPlanningContext;
    failedObject: unknown;
    validationErrors: VisualPlanValidationIssue[];
  }) {
    return this.call(
      `${INSTRUCTIONS}

Repair the failed VisualPlan exactly once.
Preserve valid visual-storytelling choices.
Correct every validation error.
Do not explain the repair.`,
      {
        serverAssignedPlanId: input.planId,
        visualPlanningContext: input.context,
        validationErrors: input.validationErrors,
        failedObject: input.failedObject
      }
    );
  }
}

export async function generateVisualPlan(
  input: {
    seriesId: string;
    sceneId: string;
    scriptId: string;
    version: number;
    series: SeriesBlueprint;
    scene: SceneBlueprint;
    script: SceneScript;
    context: VisualPlanningContext;
  },
  provider?: VisualPlanProvider
): Promise<{ plan: VisualPlan; source: VisualPlanGenerationSource }> {
  const planId = randomUUID();
  const activeProvider = provider ?? new OpenAIVisualPlanProvider();

  let candidate: unknown;
  try {
    candidate = await activeProvider.generate({ planId, context: input.context });
  } catch (error) {
    if (error instanceof VisualPlanGenerationError) throw error;
    throw new VisualPlanGenerationError("VISUAL_PLAN_GENERATION_FAILED", "Visual planning failed.");
  }

  const initial = validateVisualPlan(candidate, input.series, input.scene, input.script, {
    planId,
    seriesId: input.seriesId,
    sceneId: input.sceneId,
    scriptId: input.scriptId,
    version: input.version
  });

  if (initial.success) return { plan: initial.plan, source: "llm" };

  try {
    const repairedCandidate = await activeProvider.repair({
      planId,
      context: input.context,
      failedObject: candidate,
      validationErrors: initial.errors
    });

    const repaired = validateVisualPlan(repairedCandidate, input.series, input.scene, input.script, {
      planId,
      seriesId: input.seriesId,
      sceneId: input.sceneId,
      scriptId: input.scriptId,
      version: input.version
    });

    if (repaired.success) return { plan: repaired.plan, source: "repaired" };
  } catch {
    // One repair attempt only.
  }

  throw new VisualPlanGenerationError("VISUAL_PLAN_REPAIR_FAILED", "Visual plan could not be safely validated after one repair.");
}
