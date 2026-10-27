import type OpenAI from "openai";
import { z } from "zod";
import { StorySuggestionsSchema } from "./schema";
import { StoryAssistantError } from "./errors";

export type StoryProviderInput = { system: string; user: string; signal?: AbortSignal };
export interface StoryAssistantProvider {
  readonly capability: { enabled: boolean; reason: string };
  generate(input: StoryProviderInput): Promise<unknown>;
}
// Deliberate release gate, not an environment flag. A budget, admission controls and
// explicit activation review are required before the route can select a live client.
export const storyAssistantCapability = Object.freeze({
  enabled: false,
  reason: "Story suggestions are disabled. Live text generation needs an approved budget and provider setup. Your saved context is available; no AI request will be sent."
});
export const disabledStoryAssistantProvider: StoryAssistantProvider = {
  capability: storyAssistantCapability,
  async generate() { throw new StoryAssistantError("ASSISTANT_DISABLED"); }
};
const EnvelopeSchema = z.object({ suggestions: StorySuggestionsSchema }).strict();
const OUTPUT_SCHEMA = z.toJSONSchema(EnvelopeSchema);

/** Real transport adapter, deliberately not selected by the production route.
 * The caller owns the server-only SDK client; tests inject a non-network client.
 * No credentials are read and no SDK client is constructed in this module.
 */
export class OpenAIStoryAssistantProvider implements StoryAssistantProvider {
  readonly capability = { enabled: true, reason: "Configured storytelling transport" };
  constructor(private readonly client: Pick<OpenAI, "responses">, private readonly model: string) {
    if (!model.trim() || model.length > 120) throw new StoryAssistantError("ASSISTANT_DISABLED");
  }
  async generate({ system, user, signal }: StoryProviderInput): Promise<unknown> {
    if (signal?.aborted) throw new StoryAssistantError("ASSISTANT_ABORTED");
    if (Buffer.byteLength(system + user, "utf8") > 210_000) throw new StoryAssistantError("ASSISTANT_CONTEXT_TOO_LARGE");
    const response = await this.client.responses.create({
      model: this.model,
      store: false,
      max_output_tokens: 5000,
      input: [{ role: "developer", content: system }, { role: "user", content: user }],
      text: { format: { type: "json_schema", name: "story_suggestions", strict: true, schema: OUTPUT_SCHEMA } }
    }, { timeout: 30_000, maxRetries: 0, signal });
    if (response.status !== "completed" || !response.output_text ||
      Buffer.byteLength(response.output_text, "utf8") > 32_000 ||
      response.output.some(item => item.type === "message" && item.content.some(part => part.type === "refusal"))) {
      throw new StoryAssistantError("ASSISTANT_OUTPUT_INVALID");
    }
    try { return EnvelopeSchema.parse(JSON.parse(response.output_text)).suggestions; }
    catch { throw new StoryAssistantError("ASSISTANT_OUTPUT_INVALID"); }
  }
}
