import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import type { PersistedSeries } from "@/lib/series/persistence/types";
import type { StoryPlan } from "@/lib/story-seeds/schema";
export const seriesId = "11111111-1111-4111-8111-111111111111";
export function fixtureSeries(): PersistedSeries {
  return { id: seriesId, creatorId: "22222222-2222-4222-8222-222222222222", title: theWoundsWeKeep.identity.title, slug: null, status: "DRAFT", blueprint: structuredClone(theWoundsWeKeep), schemaVersion: "1", generationSource: "llm", createdAt: "2026-10-25T00:00:00.000Z", updatedAt: "2026-10-25T01:00:00.000Z", archivedAt: null };
}
export function fixturePlan(): StoryPlan {
  return { revision: 3, updatedAt: "2026-10-25T01:01:00.000Z", seeds: [{ id: "33333333-3333-4333-8333-333333333333", title: "A costly promise", type: "ENDING", placement: "FINALE", characterId: theWoundsWeKeep.cast[0].id, locked: true, setup: "Make the cost visible.", consequence: "An ally chooses to leave.", payoff: "The promise is honored." }] };
}
export function fixtureSuggestions() {
  return [{ title: "A costly choice", beat: "The protagonist gives up a safe exit.", whyItFits: "It makes the want conflict with the need in the story's tone.", setup: "Establish the exit before the choice.", consequences: "The ally must decide whether to stay.", sourceIds: ["blueprint:story-engine"], alternative: { beat: "Let the ally make the choice.", tradeoff: "Shifts the agency toward the relationship.", sourceIds: ["blueprint:story-engine"] } }];
}
