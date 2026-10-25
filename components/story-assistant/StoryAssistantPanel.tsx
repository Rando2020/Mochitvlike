"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  StoryAssistantContextResponseSchema, StoryAssistantResultSchema,
  type StoryAssistantResult, type StoryContext, type StorySource
} from "@/lib/story-assistant/schema";
import styles from "./StoryAssistantPanel.module.css";

export type StoryAssistantPanelProps = {
  seriesId: string;
  savedSeedRevision?: number;
  savedBlueprintUpdatedAt?: string;
  hasUnsavedChanges?: boolean;
};
type Loaded = { context: StoryContext; capability: { enabled: boolean; reason: string } };
const kindLabels: Record<StorySource["kind"], string> = {
  canon: "Established canon", planning: "Planning intent (not canon)",
  creative: "Creative direction", character: "Character motivation",
  world: "World constraints", "creator-private": "Creator-private knowledge"
};
const sameSelection = (left: string[], right: string[]) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const sameSnapshot = (left: StoryContext["snapshot"], right: StoryContext["snapshot"]) =>
  Object.keys(left).every((key) => left[key as keyof typeof left] === right[key as keyof typeof right]);

// A new series is a new instance, including the request epoch and unsent question.
export function StoryAssistantPanel(props: StoryAssistantPanelProps) {
  return <StoryAssistantSession key={props.seriesId} {...props}/>;
}

function StoryAssistantSession({ seriesId, savedSeedRevision, savedBlueprintUpdatedAt, hasUnsavedChanges = false }: StoryAssistantPanelProps) {
  const headingId = useId();
  const promptId = useId();
  const [opened, setOpened] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const selectionKey = JSON.stringify(selection);
  const [refresh, setRefresh] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [result, setResult] = useState<StoryAssistantResult | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const epoch = useRef(0);
  const controller = useRef<AbortController | null>(null);
  // Hide old render data even before the effects for changed props have run.
  const identity = JSON.stringify([seriesId, savedSeedRevision, savedBlueprintUpdatedAt, hasUnsavedChanges, selectionKey, refresh]);
  const [loadedIdentity, setLoadedIdentity] = useState("");
  const current = loadedIdentity === identity ? loaded : null;
  const visibleResult = current ? result : null;
  const endpoint = `/api/series/${encodeURIComponent(seriesId)}/story-assistant`;

  function beginRequest() {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    return { abort, id: ++epoch.current };
  }
  function active(id: number, abort: AbortController) {
    return epoch.current === id && !abort.signal.aborted;
  }
  async function readContext(signal: AbortSignal): Promise<Loaded> {
    const query = new URLSearchParams();
    selection.forEach((id) => query.append("beatId", id));
    const response = await fetch(endpoint + (query.size ? `?${query}` : ""), {
      credentials: "same-origin", cache: "no-store", signal
    });
    if (!response.ok) throw new Error("CONTEXT_UNAVAILABLE");
    const parsed = StoryAssistantContextResponseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.context.snapshot.seriesId !== seriesId ||
      !sameSelection(parsed.data.context.selectedBeatIds, selection) ||
      (savedSeedRevision !== undefined && parsed.data.context.snapshot.seedRevision < savedSeedRevision) ||
      (savedBlueprintUpdatedAt !== undefined && (!Number.isFinite(Date.parse(savedBlueprintUpdatedAt)) ||
        Date.parse(parsed.data.context.snapshot.blueprintUpdatedAt) < Date.parse(savedBlueprintUpdatedAt))) ||
      new Set(parsed.data.context.sources.map((source) => source.id)).size !== parsed.data.context.sources.length) {
      throw new Error("CONTEXT_INVALID");
    }
    return parsed.data;
  }

  useEffect(() => {
    setResult(null); setLoaded(null); setPending(false); setError("");
    if (!opened) return;
    const { id, abort } = beginRequest();
    setLoading(true);
    void readContext(abort.signal).then((data) => {
      if (!active(id, abort)) return;
      setLoaded(data); setLoadedIdentity(identity);
    }).catch(() => {
      if (active(id, abort)) setError("We could not load saved story context. No suggestions were generated. Try refreshing.");
    }).finally(() => { if (active(id, abort)) setLoading(false); });
    return () => { abort.abort(); controller.current?.abort(); ++epoch.current; };
    // These values fully identify the saved context and its inclusion state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, identity]);

  useEffect(() => {
    if (!opened) return;
    const invalidate = () => {
      controller.current?.abort(); ++epoch.current;
      setResult(null); setRefresh((value) => value + 1);
    };
    window.addEventListener("focus", invalidate);
    return () => window.removeEventListener("focus", invalidate);
  }, [opened]);

  async function suggest() {
    if (!current?.capability.enabled || loading || pending || !question.trim()) return;
    const requestContext = current.context;
    const { id, abort } = beginRequest();
    setPending(true); setError(""); setResult(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST", credentials: "same-origin", cache: "no-store", signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question.trim(), selectedBeatIds: selection, expectedSnapshot: requestContext.snapshot.digest })
      });
      if (!active(id, abort)) return;
      if (!response.ok) {
        setError(response.status === 409 ? "Saved story context changed. Refresh before asking again."
          : response.status === 503 ? "Live generation is unavailable. Your story was not changed."
          : "The storytelling request could not be completed. Your story was not changed.");
        return;
      }
      const parsed = StoryAssistantResultSchema.safeParse(await response.json());
      if (!active(id, abort)) return;
      const sourceIds = new Set(requestContext.sources.map((source) => source.id));
      if (!parsed.success || !sameSnapshot(parsed.data.snapshot, requestContext.snapshot) ||
        parsed.data.suggestions.some((suggestion) => [...suggestion.sourceIds, ...suggestion.alternative.sourceIds].some((id) => !sourceIds.has(id)))) {
        setError("We could not validate the suggestions. No unverified response was displayed.");
        return;
      }
      const verified = await readContext(abort.signal);
      if (!active(id, abort)) return;
      setLoaded(verified);
      if (!sameSnapshot(verified.context.snapshot, requestContext.snapshot)) {
        setError("Saved story context changed while the suggestions were being prepared. Ask again using the refreshed context.");
        return;
      }
      if (!verified.capability.enabled) {
        setError("Live generation is now unavailable. No suggestions were displayed.");
        return;
      }
      setResult(parsed.data);
    } catch {
      if (active(id, abort)) setError("We could not verify current saved story context. No suggestions were displayed. Refresh and try again.");
    } finally { if (active(id, abort)) setPending(false); }
  }
  function citations(ids: string[]) {
    return <ul className={styles.citations} aria-label="Saved sources">{ids.map((id) => {
      const source = current?.context.sources.find((entry) => entry.id === id);
      return <li key={id}><span>{source?.label}</span> <small>{source && kindLabels[source.kind]}</small><code>{id}</code></li>;
    })}</ul>;
  }

  return <section className={styles.panel} aria-labelledby={headingId}>
    <div className={styles.header}>
      <div><span className={styles.eyebrow}>CREATOR-ONLY WRITER'S ROOM</span><h2 id={headingId}>Storytelling assistant</h2></div>
      <span className={styles.badge}>Suggestions only</span>
    </div>
    <p>Explore beats that fit your genre, tone and characters, grounded in your existing saved bible and story seeds. Nothing is written to your story automatically.</p>
    {hasUnsavedChanges && <p className={styles.notice}>Unsaved edits and new ideas are not included. Save them in Studio first to use them as context.</p>}
    {!opened ? <button className={styles.button} type="button" onClick={() => setOpened(true)}>Open storytelling assistant</button> : <>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => {
          controller.current?.abort(); ++epoch.current; setResult(null); setRefresh((value) => value + 1);
        }}>Refresh saved context</button>
        <span className={styles.small}>Private creator context. Not connected to fan or rehearsal chat.</span>
      </div>
      {loading && <p role="status">Loading saved story context…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {current && <>
        <p className={styles.notice} role="status">{current.capability.reason}</p>
        <div className={styles.metadata}>
          <span>Saved seed revision {current.context.snapshot.seedRevision}</span>
          <span>Bible saved {current.context.snapshot.blueprintUpdatedAt}</span>
          <details><summary>Snapshot digest</summary><code>{current.context.snapshot.digest}</code></details>
        </div>
        {current.context.snapshot.seedRevision === 0 && <p className={styles.small}>No saved story seeds yet. Only the saved bible is included.</p>}
        <p className={styles.small}>Locked seeds are planning intent, not canon. Outline beats and future reveals describe intentions, not events that have happened.</p>
        <fieldset className={styles.beats} disabled={pending}>
          <legend>Focus on saved episode beats</legend>
          <p className={styles.small}>Leave all unchecked to include every saved beat.</p>
          {current.context.availableBeats.map((beat) => <label key={beat.id}>
            <input type="checkbox" checked={selection.includes(beat.id)} onChange={(event) => {
              controller.current?.abort(); ++epoch.current; setResult(null);
              setSelection((previous) => event.target.checked ? [...previous, beat.id] : previous.filter((id) => id !== beat.id));
            }}/><span>{beat.summary}</span>
          </label>)}
        </fieldset>
        <details className={styles.sources}>
          <summary>Inspect included saved sources ({current.context.sources.length})</summary>
          {current.context.sources.map((source) => <details key={source.id} className={styles.source}>
            <summary><strong>{source.label}</strong> <span>{kindLabels[source.kind]}</span></summary>
            <code>{source.id}</code><pre>{source.content}</pre>
          </details>)}
        </details>
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void suggest(); }}>
          <label htmlFor={promptId}>Your story question</label>
          <textarea id={promptId} rows={3} maxLength={2000} value={question} disabled={pending}
            placeholder="Help me earn this ending. What setup is missing, and what could happen instead?"
            onChange={(event) => setQuestion(event.target.value)}/>
          <div className={styles.actions}><small>{question.length} / 2000 · No automatic edits</small>
            <button type="submit" className={styles.button} disabled={!current.capability.enabled || pending || loading || !question.trim()}>Suggest story beats</button>
          </div>
        </form>
        {pending && <p role="status">Preparing suggestions and checking the saved context…</p>}
        {visibleResult && <div className={styles.results} aria-live="polite">
          <p className={styles.small}>Proposals to review, not canon or guaranteed story quality. Choose what serves your story; no formula is required.</p>
          {visibleResult.suggestions.map((suggestion, index) => <article key={index} className={styles.suggestion} aria-label={suggestion.title}>
            <h3>{suggestion.title}</h3><p>{suggestion.beat}</p>
            <dl><dt>Why it fits</dt><dd>{suggestion.whyItFits}</dd><dt>Setup to earn it</dt><dd>{suggestion.setup}</dd><dt>Possible consequences</dt><dd>{suggestion.consequences}</dd></dl>
            {citations(suggestion.sourceIds)}
            <h4>Another direction</h4><p>{suggestion.alternative.beat}</p><p><strong>Tradeoff: </strong>{suggestion.alternative.tradeoff}</p>
            {citations(suggestion.alternative.sourceIds)}
          </article>)}
        </div>}
      </>}
    </>}
  </section>;
}
