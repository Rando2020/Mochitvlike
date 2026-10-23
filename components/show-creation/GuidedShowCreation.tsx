"use client";

import { useEffect, useRef, useState } from "react";
import { CrayvoBrand } from "@/components/brand/CrayvoBrand";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { SeriesIdeaRequestSchema } from "@/lib/series/generationRequest";
import { SeriesBlueprintSchema } from "@/lib/series/schema";
import { hasValidSeriesBlueprintInvariants } from "@/lib/series/persistence/validateBlueprintInvariants";
import { persistGeneratedSeries } from "@/lib/series/createSeries";
import type { SeriesBlueprint } from "@/lib/series/types";
import type { SeriesSummary } from "@/lib/series/persistence/types";
import { CharacterDirectionSchema, EMPTY_CHARACTER_DIRECTION, type CharacterDirection } from "@/lib/character-direction/schema";
import { hasCharacterDirection } from "@/lib/character-direction/compile";
import { CharacterDirectionControls, CharacterDirectionSummary } from "./CharacterDirectionControls";
import styles from "./GuidedShowCreation.module.css";

const GenerationErrorSchema = z.object({ error: z.object({ code: z.string() }) });

function generationErrorMessage(status: number, code: string): string {
  if (code === "GENERATION_DISABLED") return "Show creation is paused. Your idea is still here.";
  if (code === "GENERATION_LIMIT_UNAVAILABLE") return "Show creation is temporarily unavailable. Your idea is safe; try again later.";
  if (status === 429) return "The generation limit has been reached or another request is running. Your idea is safe; try again later.";
  if (status === 401 || code === "UNAUTHENTICATED") return "Your session ended. Sign in again; your idea stays in this tab.";
  if (status === 503 || code === "SERIES_PROVIDER_UNAVAILABLE") return "Show creation is not connected yet. Your idea is still here.";
  if (code === "SERIES_REPAIR_FAILED") return "The AI returned a story that did not pass the studio's checks, even after one repair. Your idea is safe; try again.";
  if (code === "SERIES_GENERATION_FAILED") return "The AI could not complete your story direction. Your idea is safe; please try again later.";
  if (status === 400 || code === "INVALID_SERIES_IDEA") return "The idea or episode settings were not accepted. Review them and try again.";
  if (status >= 500) return "The story service encountered an error. Your idea is safe; try again later.";
  return "We could not develop a valid direction. Your idea is still here; try again.";
}

const GeneratedSchema = z.object({
  seriesBlueprint: SeriesBlueprintSchema,
  metadata: z.object({ source: z.enum(["llm", "repaired"]), schemaVersion: z.literal("1.0") })
});
type Generated = z.infer<typeof GeneratedSchema>;
const DraftSchema = z.object({
  protagonistDirection: CharacterDirectionSchema.optional(),
  idea: z.string().max(5000), seconds: z.number().int().min(30).max(120), episodes: z.number().int().min(8).max(20),
  generated: GeneratedSchema.nullable(), creationId: z.string().uuid(), savedId: z.string().uuid().nullable()
});

export function GuidedShowCreation({ creatorId, providerReady, generationEnabled = true, series = [], connectionIssue = false }: {
  creatorId: string | null;
  providerReady: boolean;
  generationEnabled?: boolean;
  series?: SeriesSummary[];
  connectionIssue?: boolean;
}) {
  const router = useRouter();
  const [protagonistDirection, setProtagonistDirection] = useState<CharacterDirection>(() => structuredClone(EMPTY_CHARACTER_DIRECTION));
  const [idea, setIdea] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [episodes, setEpisodes] = useState(12);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [creationId, setCreationId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null | undefined>(undefined);
  const [pending, setPending] = useState<"generate" | "save" | "starter" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const key = creatorId ? `show-creation-v1:${creatorId}` : null;

  useEffect(() => {
    setProtagonistDirection(structuredClone(EMPTY_CHARACTER_DIRECTION));
    setIdea(""); setSeconds(60); setEpisodes(12); setGenerated(null); setCreationId(null); setSavedId(null); setMessage(null);
    if (key) {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const draft = DraftSchema.safeParse(JSON.parse(raw));
          if (draft.success && (!draft.data.generated || hasValidSeriesBlueprintInvariants(draft.data.generated.seriesBlueprint))) {
            setProtagonistDirection(draft.data.protagonistDirection ?? structuredClone(EMPTY_CHARACTER_DIRECTION));
            setIdea(draft.data.idea); setSeconds(draft.data.seconds); setEpisodes(draft.data.episodes);
            setGenerated(draft.data.generated); setCreationId(draft.data.creationId); setSavedId(draft.data.savedId);
          } else sessionStorage.removeItem(key);
        }
      } catch { setStorageAvailable(false); }
    }
    setHydratedKey(key); setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded || hydratedKey !== key || !key || !creationId) return;
    try { sessionStorage.setItem(key, JSON.stringify({ protagonistDirection, idea, seconds, episodes, generated, creationId, savedId })); }
    catch { setStorageAvailable(false); }
  }, [loaded, hydratedKey, key, protagonistDirection, idea, seconds, episodes, generated, creationId, savedId]);

  useEffect(() => { if (loaded && !creationId) setCreationId(crypto.randomUUID()); }, [loaded, creationId]);
  useEffect(() => { if (generated) heading.current?.focus(); }, [generated]);

  async function explore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !creatorId || !providerReady || !generationEnabled) return;
    const input = SeriesIdeaRequestSchema.safeParse({ idea, ...(hasCharacterDirection(protagonistDirection) ? { protagonistDirection } : {}), preferences: { episodeLengthSeconds: seconds, targetEpisodeCount: episodes } });
    if (!input.success) { setMessage("Describe your show in 3 to 5,000 characters and choose a supported episode format."); return; }
    busy.current = true; setPending("generate"); setMessage(null);
    try {
      const response = await fetch("/api/series/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const parsedError = GenerationErrorSchema.safeParse(body);
        setMessage(generationErrorMessage(response.status, parsedError.success ? parsedError.data.error.code : ""));
        return;
      }
      const result = GeneratedSchema.safeParse(await response.json());
      if (!result.success || !hasValidSeriesBlueprintInvariants(result.data.seriesBlueprint) ||
          result.data.seriesBlueprint.season.format.episodeLengthSeconds !== seconds ||
          result.data.seriesBlueprint.season.format.targetEpisodeCount !== episodes) throw new Error("INVALID_DIRECTION");
      if (hasCharacterDirection(protagonistDirection) && JSON.stringify(result.data.seriesBlueprint.cast.find(member => member.role === "PROTAGONIST")?.generationDirection) !== JSON.stringify(protagonistDirection)) throw new Error("MISSING_CHARACTER_DIRECTION");
      setCreationId(crypto.randomUUID()); setSavedId(null); setGenerated(result.data);
    } catch { setMessage("We could not develop a valid direction. Your idea is still here; check your connection and try again."); }
    finally { busy.current = false; setPending(null); }
  }

  async function saveStarterDraft() {
    if (busy.current || !creatorId || !creationId || generated) return;
    const parsed = SeriesIdeaRequestSchema.safeParse({
      idea,
      ...(hasCharacterDirection(protagonistDirection) ? { protagonistDirection } : {}),
      preferences: { episodeLengthSeconds: seconds, targetEpisodeCount: episodes }
    });
    if (!parsed.success) {
      setMessage("Describe your idea in 3 to 5,000 characters and choose a supported episode format.");
      return;
    }
    busy.current = true; setPending("starter"); setMessage(null);
    try {
      const response = await fetch("/api/series/starter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, creationId })
      });
      if (!response.ok) {
        if (response.status === 401) {
          setMessage("Your session ended. Sign in again; your idea stays in this tab.");
          return;
        }
        throw new Error("STARTER_SAVE_UNCONFIRMED");
      }
      const receipt = await response.json();
      if (receipt.kind !== "STARTER_DRAFT" || receipt.series?.id !== creationId) throw new Error("INVALID_STARTER_RECEIPT");
      setSavedId(creationId);
      router.push(`/series/${creationId}`);
    } catch {
      setMessage("The draft save could not be confirmed. Your idea is still here. Retry without editing to recover the same show.");
    } finally {
      busy.current = false; setPending(null);
    }
  }

  async function save() {
    if (busy.current || !generated || !creationId || !creatorId) return;
    busy.current = true; setPending("save"); setMessage(null);
    try {
      const result = await persistGeneratedSeries({ ...generated, creationId });
      if (!z.string().uuid().safeParse(result.series?.id).success || result.series.id !== creationId) throw new Error("INVALID_SAVE_RESPONSE");
      setSavedId(result.series.id);
      // Write receipt before navigation; a reload can open the same saved series.
      if (key) {
        try { sessionStorage.setItem(key, JSON.stringify({ protagonistDirection, idea, seconds, episodes, generated, creationId, savedId: result.series.id })); }
        catch { setStorageAvailable(false); }
      }
      router.push(`/series/${result.series.id}`);
    } catch { setMessage("We could not confirm the save. Your direction is still here. Try saving again; the same series ID will be reused."); }
    finally { busy.current = false; setPending(null); }
  }

  function revise() {
    setGenerated(null); setSavedId(null); setMessage(null); setCreationId(crypto.randomUUID());
  }
  const blueprint = generated?.seriesBlueprint as SeriesBlueprint | undefined;
  const protagonist = blueprint?.cast.find(member => member.role === "PROTAGONIST");

  return (
    <main className={styles.page}>
      <nav className={styles.topbar} aria-label="Studio access"><CrayvoBrand /><a href="/studio">Your shows</a><a href={creatorId ? "/account" : "/login"}>{creatorId ? "Your account" : "Sign in"}</a></nav>
      <header className={styles.hero}>
        <img src="/design/story-spark-v1.webp" alt="" className={styles.art} width={1200} height={800} />
        <div className={styles.heroCopy}><span className={styles.eyebrow}>Your imagination, a place to begin</span><h1>What would you love to watch?</h1><p>Start with an idea. Shape its direction. Step into your show's Studio.</p></div>
      </header>
      <ol className={styles.steps} aria-label="Show creation steps"><li aria-current={!generated ? "step" : undefined}>1 · Your idea</li><li aria-current={generated && !savedId ? "step" : undefined}>2 · Story direction</li><li aria-current={savedId ? "step" : undefined}>3 · Saved Studio</li></ol>
      {connectionIssue ? <p className={styles.notice} role="alert">The Studio could not connect to your account or saved shows. Try reloading once the connection is available.</p> : null}
      {!creatorId ? <p className={styles.notice}>Sign in to develop and save your show. <a href="/login">Open sign-in</a></p> : !generationEnabled ? <p className={styles.notice}>AI story development is currently paused. You can still save your own idea as a starter draft below, without generating or paying for AI.</p> : !providerReady ? <p className={styles.notice}>AI story development is not connected yet. You can still save a starter draft below.</p> : null}
      <section className={styles.workspace} aria-busy={pending !== null}>
        {blueprint ? <div>
          <span className={styles.eyebrow}>{savedId ? "Saved to your shows" : "Your starting direction · not saved yet"}</span>
          <h2 ref={heading} tabIndex={-1}>{blueprint.identity.title}</h2>
          <p className={styles.logline}>{blueprint.identity.logline}</p>
          <div className={styles.reviewGrid}>
            <article><h3>The premise</h3><p>{blueprint.identity.shortPremise}</p></article>
            <article><h3>{protagonist?.name}'s drive</h3><p>{protagonist?.want}</p></article>
            <article><h3>The central tension</h3><p>{blueprint.storyEngine.centralConflict}</p></article>
            <article><h3>Episode 1 opens with…</h3><p>{blueprint.episodeOne.hook}</p></article>
          </div>
          {protagonist?.generationDirection ? <article><h3>Main character direction</h3><CharacterDirectionSummary direction={protagonist.generationDirection} /><p className={styles.hint}>These choices guide future character, scene, and voice preparation. No character art or audio has been generated.</p></article> : null}
          <p className={styles.hint}>{blueprint.season.format.targetEpisodeCount} episodes · {blueprint.season.format.episodeLengthSeconds} seconds each. This is a story foundation; media comes later.</p>
          {blueprint.clarification.needed ? <details className={styles.questions}><summary>Questions to explore later</summary>{blueprint.clarification.questions.map(q => <p key={q.id}><strong>{q.question}</strong><br />{q.whyItMatters}</p>)}</details> : null}
          <div className={styles.actions}>{savedId ? <a href={`/series/${savedId}`} className={styles.primary}>Open saved Studio</a> : <button type="button" className={styles.primary} disabled={pending !== null || !loaded} onClick={() => void save()}>{pending === "save" ? "Saving your show…" : "Save and open Studio"}</button>}<button type="button" className={styles.secondary} disabled={pending !== null} onClick={revise}>{savedId ? "Start another show" : "Revise my idea"}</button></div>
        </div> : <form onSubmit={explore}>
          <h2>Your idea is enough to start.</h2>
          <label htmlFor="show-idea">Describe your show</label>
          <textarea id="show-idea" value={idea} onChange={e => setIdea(e.target.value)} placeholder="A healer takes on other people's wounds, until one wound begins speaking…" required minLength={3} maxLength={5000} rows={5} disabled={pending !== null} aria-describedby="idea-help" />
          <p id="idea-help" className={styles.hint}>A character, a conflict, or a feeling. Up to 5,000 characters.</p>
          <CharacterDirectionControls value={protagonistDirection} onChange={setProtagonistDirection} disabled={pending !== null} />
          <details className={styles.options}><summary>Episode format · {seconds}s × {episodes} episodes</summary><div className={styles.formatGrid}><label>Episode length (seconds)<input type="number" min={30} max={120} step={1} value={seconds} disabled={pending !== null} onChange={e => setSeconds(Number(e.target.value))} required /></label><label>Season length (episodes)<input type="number" min={8} max={20} step={1} value={episodes} disabled={pending !== null} onChange={e => setEpisodes(Number(e.target.value))} required /></label></div></details>
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={pending !== null || !loaded || hydratedKey !== key || !creatorId || !providerReady || !generationEnabled}>{pending === "generate" ? "Developing your direction…" : "Explore this show"}</button>
            <button type="button" className={styles.secondary} onClick={() => void saveStarterDraft()} disabled={pending !== null || !loaded || hydratedKey !== key || !creatorId || !creationId || idea.trim().length < 3}>{pending === "starter" ? "Saving your starter draft…" : "Save my idea as a draft (no AI)"}</button>
          </div>
          <p className={styles.hint}>AI exploration requires an enabled provider. The no-AI option saves your exact idea and a clearly marked, unfinished structure with placeholder characters and beats. It does not invent story details.</p>
        </form>}
        {message ? <p className={styles.error} role="alert">{message}{message.startsWith("Your session ended.") ? <> <a href="/login">Sign-in page</a></> : null}</p> : null}
        <p className={styles.hint} role="status">{pending === "generate" ? "Developing the story foundation. Keep this page open." : pending === "save" ? "Saving the reviewed story foundation." : pending === "starter" ? "Saving a starter draft without AI." : storageAvailable && creatorId ? "Your draft stays in this browser tab until you close it." : "Draft recovery is unavailable here. Keep this page open to preserve your work."}</p>
      </section>
      {series.length ? <section className={styles.saved} aria-labelledby="saved-shows"><h2 id="saved-shows">Continue your shows</h2><div className={styles.savedGrid}>{series.filter(item => item.status !== "ARCHIVED").map(item => <a key={item.id} href={`/series/${item.id}`}><h3>{item.title}</h3><p>{item.logline}</p><span>Open Studio →</span></a>)}</div></section> : null}
    </main>
  );
}
