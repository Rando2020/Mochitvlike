export class StoryAssistantError extends Error {
  constructor(public readonly code:
    | "ASSISTANT_DISABLED" | "ASSISTANT_INVALID_INPUT" | "ASSISTANT_CONTEXT_INVALID"
    | "ASSISTANT_CONTEXT_TOO_LARGE" | "ASSISTANT_STALE_CONTEXT" | "ASSISTANT_OUTPUT_INVALID"
    | "ASSISTANT_GENERATION_FAILED" | "ASSISTANT_ABORTED") {
    super(code);
    this.name = "StoryAssistantError";
  }
}
