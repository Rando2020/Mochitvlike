"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { SeriesIdeaRequestSchema } from "@/lib/series/generationRequest";
import { SeriesBlueprintSchema } from "@/lib/series/schema";
import { hasValidSeriesBlueprintInvariants } from "@/lib/series/persistence/validateBlueprintInvariants";
import { persistGeneratedSeries } from "@/lib/series/createSeries";
import type { SeriesBlueprint } from "@/lib/series/types";
import type { SeriesSummary } from "@/lib/series/persistence/types";
import styles from "./GuidedShowCreation.module.css";

const GeneratedSchema = z.object({
  seriesBlueprint: SeriesBlueprintSchema,
  metadata: z.object({ source: z.enum(["llm", "repaired"]), schemaVersion: z.literal("1.0") })
});
type Generated = z.infer<typeof GeneratedSchema>;
const DraftSchema = z.object({
  idea: z.string().max(5000), seconds: z.number().int().min(30).max(120), episodes: z.number().int().min(8).max(20),
  generated: GeneratedSchema.nullable(), creationId: z.string().uuid(), savedId: z.string().uuid().nullable()
});

export function GuidedShowCreation({ creatorId, providerReady, series = [], connectionIssue = false }: {
  creatorId: string | null;
  providerReady: boolean;
  series?: SeriesSummary[];
  connectionIssue?: boolean;
}) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [episodes, setEpisodes] = useState(12);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [creationId, setCreationId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null | undefined>(undefined);
  const [pending, setPending] = useState<"generate" | "save" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const key = creatorId ? `show-creation-v1:${creatorId}` : null;

  useEffect(() => {
    setIdea(""); setSeconds(60); setEpisodes(12); setGenerated(null); setCreationId(null); setSavedId(null); setMessage(null);
    if (key) {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const draft = DraftSchema.safeParse(JSON.parse(raw));
          if (draft.success && (!draft.data.generated || hasValidSeriesBlueprintInvariants(draft.data.generated.seriesBlueprint))) {
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
    try { sessionStorage.setItem(key, JSON.stringify({ idea, seconds, episodes, generated, creationId, savedId })); }
    catch { setStorageAvailable(false); }
  }, [loaded, hydratedKey, key, idea, seconds, episodes, generated, creationId, savedId]);

  useEffect(() => { if (loaded && !creationId) setCreationId(crypto.randomUUID()); }, [loaded, creationId]);
  useEffect(() => { if (generated) heading.current?.focus(); }, [generated]);

  async function explore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !creatorId || !providerReady) return;
    const input = SeriesIdeaRequestSchema.safeParse({ idea, preferences: { episodeLengthSeconds: seconds, targetEpisodeCount: episodes } });
    if (!input.success) { setMessage("Describe your show in 3 to 5,000 characters and choose a supported episode format."); return; }
    busy.current = true; setPending("generate"); setMessage(null);
    try {
      const response = await fetch("/api/series/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
      if (!response.ok) {
        setMessage(response.status === 401 ? "Your session ended. Sign in again; your idea stays in this tab." : response.status === 503 ? "Show creation is not connected yet. Your idea is still here." : "We could not develop a valid direction. Your idea is still here; try again.");
        return;
      }
      const result = GeneratedSchema.safeParse(await response.json());
      if (!result.success || !hasValidSeriesBlueprintInvariants(result.data.seriesBlueprint) ||
          result.data.seriesBlueprint.season.format.episodeLengthSeconds !== seconds ||
          result.data.seriesBlueprint.season.format.targetEpisodeCount !== episodes) throw new Error("INVALID_DIRECTION");
      setCreationId(crypto.randomUUID()); setSavedId(null); setGenerated(result.data);
    } catch { setMessage("We could not develop a valid direction. Your idea is still here; check your connection and try again."); }
    finally { busy.current = false; setPending(null); }
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
        try { sessionStorage.setItem(key, JSON.stringify({ idea, seconds, episodes, generated, creationId, savedId: result.series.id })); }
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
      <nav className={styles.topbar} aria-label="Studio access"><a href="/" className={styles.brand}>Series Studio</a><a href={creatorId ? "/account" : "/login"}>{creatorId ? "Your account" : "Sign in"}</a></nav>
      <header className={styles.hero}>
        <img src="/design/story-spark-v1.webp" alt="" className={styles.art} width={1200} height={800} />
        <div className={styles.heroCopy}><span className={styles.eyebrow}>Your imagination, a place to begin</span><h1>What would you love to watch?</h1><p>Start with an idea. Shape its direction. Step into your show's Studio.</p></div>
      </header>
      <ol className={styles.steps} aria-label="Show creation steps"><li aria-current={!generated ? "step" : undefined}>1 · Your idea</li><li aria-current={generated && !savedId ? "step" : undefined}>2 · Story direction</li><li aria-current={savedId ? "step" : undefined}>3 · Saved Studio</li></ol>
      {connectionIssue ? <p className={styles.notice} role="alert">The Studio could not connect to your account or saved shows. Try reloading once the connection is available.</p> : null}
      {!creatorId ? <p className={styles.notice}>Sign in to develop and save your show. <a href="/login">Open sign-in</a></p> : !providerReady ? <p className={styles.notice}>Show creation is not connected yet. You can continue an existing show below.</p> : null}
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
          <p className={styles.hint}>{blueprint.season.format.targetEpisodeCount} episodes · {blueprint.season.format.episodeLengthSeconds} seconds each. This is a story foundation; media comes later.</p>
          {blueprint.clarification.needed ? <details className={styles.questions}><summary>Questions to explore later</summary>{blueprint.clarification.questions.map(q => <p key={q.id}><strong>{q.question}</strong><br />{q.whyItMatters}</p>)}</details> : null}
          <div className={styles.actions}>{savedId ? <a href={`/series/${savedId}`} className={styles.primary}>Open saved Studio</a> : <button type="button" className={styles.primary} disabled={pending !== null || !loaded} onClick={() => void save()}>{pending === "save" ? "Saving your show…" : "Save and open Studio"}</button>}<button type="button" className={styles.secondary} disabled={pending !== null} onClick={revise}>{savedId ? "Start another show" : "Revise my idea"}</button></div>
        </div> : <form onSubmit={explore}>
          <h2>Your idea is enough to start.</h2>
          <label htmlFor="show-idea">Describe your show</label>
          <textarea id="show-idea" value={idea} onChange={e => setIdea(e.target.value)} placeholder="A healer takes on other people's wounds, until one wound begins speaking…" required minLength={3} maxLength={5000} rows={5} disabled={pending !== null} aria-describedby="idea-help" />
          <p id="idea-help" className={styles.hint}>A character, a conflict, or a feeling. Up to 5,000 characters.</p>
          <details className={styles.options}><summary>Episode format · {seconds}s × {episodes} episodes</summary><div className={styles.formatGrid}><label>Episode length (seconds)<input type="number" min={30} max={120} step={1} value={seconds} disabled={pending !== null} onChange={e => setSeconds(Number(e.target.value))} required /></label><label>Season length (episodes)<input type="number" min={8} max={20} step={1} value={episodes} disabled={pending !== null} onChange={e => setEpisodes(Number(e.target.value))} required /></label></div></details>
          <div className={styles.actions}><button type="submit" className={styles.primary} disabled={pending !== null || !loaded || hydratedKey !== key || !creatorId || !providerReady}>{pending === "generate" ? "Developing your direction…" : "Explore this show"}</button></div>
          <p className={styles.hint}>You'll review the direction before saving your show.</p>
        </form>}
        {message ? <p className={styles.error} role="alert">{message}{creatorId ? <> <a href="/login">Sign-in page</a></> : null}</p> : null}
        <p className={styles.hint} role="status">{pending === "generate" ? "Developing the story foundation. Keep this page open." : pending === "save" ? "Saving the reviewed story foundation." : storageAvailable && creatorId ? "Your draft stays in this browser tab until you close it." : "Draft recovery is unavailable here. Keep this page open to preserve your work."}</p>
      </section>
      {series.length ? <section className={styles.saved} aria-labelledby="saved-shows"><h2 id="saved-shows">Continue your shows</h2><div className={styles.savedGrid}>{series.filter(item => item.status !== "ARCHIVED").map(item => <a key={item.id} href={`/series/${item.id}`}><h3>{item.title}</h3><p>{item.logline}</p><span>Open Studio →</span></a>)}</div></section> : null}
    </main>
  );
}
