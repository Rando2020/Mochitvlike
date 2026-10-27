import { createHash } from "node:crypto";
import { z } from "zod";
import type { PersistedSeries } from "@/lib/series/persistence/types";
import { validatePersistedSeriesBlueprint } from "@/lib/series/persistence/validatePersistedSeries";
import { validateStorySeeds, type StoryPlan } from "@/lib/story-seeds/schema";
import { StoryAssistantError } from "./errors";
import { SelectedBeatIdsSchema, StoryContextSchema, type StoryContext, type StorySource } from "./schema";

const MAX_CONTEXT_BYTES = 200_000;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function hash(value: unknown) { return createHash("sha256").update(canonical(value)).digest("hex"); }

/** Creator-only server context. The authenticated owner is established by the caller. */
export function buildStoryContext(series: PersistedSeries, plan: StoryPlan, selectedBeatIds: string[] = []): StoryContext {
  const selected = SelectedBeatIdsSchema.safeParse(selectedBeatIds);
  if (!selected.success) throw new StoryAssistantError("ASSISTANT_INVALID_INPUT");
  let blueprint: PersistedSeries["blueprint"];
  let seeds: StoryPlan["seeds"];
  try {
    blueprint = validatePersistedSeriesBlueprint(series.blueprint);
    seeds = validateStorySeeds(plan.seeds, blueprint);
    if (series.status === "ARCHIVED" || series.archivedAt || !Number.isInteger(plan.revision) || plan.revision < 0 ||
      (plan.revision === 0 && (seeds.length !== 0 || plan.updatedAt !== null)) ||
      (plan.revision > 0 && !z.iso.datetime({ offset: true }).safeParse(plan.updatedAt).success)) throw new Error("Invalid snapshot");
  } catch { throw new StoryAssistantError("ASSISTANT_CONTEXT_INVALID"); }
  const availableBeats = blueprint.episodeOne.beats.map(({ id, summary }) => ({ id, summary }));
  const availableIds = new Set(availableBeats.map(beat => beat.id));
  if (selected.data.some(id => !availableIds.has(id))) throw new StoryAssistantError("ASSISTANT_INVALID_INPUT");
  const selectedIds = availableBeats.filter(beat => selected.data.includes(beat.id)).map(beat => beat.id);
  const sources: StorySource[] = [];
  const add = (id: string, kind: StorySource["kind"], label: string, content: unknown) => {
    if (sources.some(source => source.id === id)) throw new StoryAssistantError("ASSISTANT_CONTEXT_INVALID");
    sources.push({ id, kind, label, content: canonical(content) });
  };
  const key = (prefix: string, id: string) => {
    const encoded = `${prefix}:${encodeURIComponent(id)}`;
    // Valid stored IDs can expand ninefold in percent encoding. A literal colon
    // cannot occur in a short encoded suffix, keeping the hash namespace distinct.
    return encoded.length <= 250 ? encoded : `${prefix}:sha256:${hash(id)}`;
  };
  add("blueprint:identity", "creative", "Saved genre and premise", blueprint.identity);
  add("blueprint:tone", "creative", "Saved tone", blueprint.creativeDNA.tone);
  add("blueprint:pacing", "creative", "Saved pacing", blueprint.creativeDNA.pacing);
  add("blueprint:story-engine", "creative", "Saved story engine and audience promises", blueprint.storyEngine);
  add("blueprint:world", "world", "World premise", { name: blueprint.world.name, summary: blueprint.world.summary });
  add("blueprint:power-system", "world", "World power rules, costs and limitations", blueprint.world.powerSystem);
  blueprint.world.rules.forEach(rule => add(key("blueprint:world-rule", rule.id), "world", `World rule: ${rule.id}`, rule));
  blueprint.world.factions.forEach(faction => add(key("blueprint:faction", faction.id), "world", faction.name, faction));
  blueprint.world.locations.forEach(location => add(key("blueprint:location", location.id), "world", location.name, location));
  blueprint.cast.forEach(member => add(key("blueprint:character", member.id), "character", `${member.name}: motivation and voice`, {
    id: member.id, name: member.name, role: member.role, storyFunction: member.storyFunction, summary: member.summary,
    want: member.want, need: member.need, internalConflict: member.internalConflict,
    personalityTraits: member.personalityTraits, relationshipToProtagonist: member.relationshipToProtagonist,
    characterSheetSeed: { personality: member.characterSheetSeed.personality, backstory: member.characterSheetSeed.backstory,
      communicationStyle: member.characterSheetSeed.communicationStyle, relationshipStyle: member.characterSheetSeed.relationshipStyle }
  }));
  blueprint.relationships.forEach((relationship, index) => add(`blueprint:relationship:${index}`, "planning", "Saved relationship direction (not established events)", relationship));
  add("blueprint:season", "planning", "Season outline intent (not established events)", blueprint.season);
  const { beats: _beats, ...episode } = blueprint.episodeOne;
  add("blueprint:episode-one", "planning", "Episode outline intent (not established events)", episode);
  blueprint.episodeOne.beats.filter(beat => selectedIds.length === 0 || selectedIds.includes(beat.id)).forEach(beat =>
    add(key("blueprint:beat", beat.id), "planning", `Outline beat: ${beat.id}`, beat));
  blueprint.canon.facts.forEach(fact => add(key("blueprint:canon", fact.id), "canon", `Saved canon fact: ${fact.id}`, fact));
  blueprint.canon.mysteries.forEach(mystery => add(key("blueprint:mystery", mystery.id), "creator-private", `Creator-only mystery: ${mystery.id}`, mystery));
  seeds.forEach(seed => add(key("seed", seed.id), "planning", `${seed.locked ? "Locked " : ""}planned seed (not canon): ${seed.title}`, seed));
  const identity = {
    seriesId: series.id,
    blueprintUpdatedAt: series.updatedAt,
    blueprintDigest: hash(blueprint),
    seedRevision: plan.revision,
    seedDigest: hash({ revision: plan.revision, seeds, updatedAt: plan.updatedAt })
  };
  const snapshot = { ...identity, digest: hash({ ...identity, selectedBeatIds: selectedIds, sources }) };
  const result = { snapshot, sources, selectedBeatIds: selectedIds, availableBeats };
  if (Buffer.byteLength(canonical(result), "utf8") > MAX_CONTEXT_BYTES) throw new StoryAssistantError("ASSISTANT_CONTEXT_TOO_LARGE");
  const checked = StoryContextSchema.safeParse(result);
  if (!checked.success) throw new StoryAssistantError("ASSISTANT_CONTEXT_INVALID");
  return checked.data;
}
