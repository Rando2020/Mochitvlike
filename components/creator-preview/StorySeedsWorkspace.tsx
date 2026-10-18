"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SeriesBlueprint } from "@/lib/series/types";
import { lockedSeedChanges, type StoryPlan, type StoryPlanSaveInput, type StorySeed } from "@/lib/story-seeds/schema";
import base from "./CreatorExperiencePreview.module.css";
import styles from "./StorySeedsWorkspace.module.css";

const types = ["EVENT", "REVEAL", "RELATIONSHIP", "ENDING"] as const;
const placements = ["OPENING", "MIDPOINT", "FINALE", "UNPLACED"] as const;
const emptyPlan: StoryPlan = { revision: 0, seeds: [], updatedAt: null };

function describeProblem(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete the request.";
}
function seedFrom(
  title: string, placement: StorySeed["placement"], type: StorySeed["type"], characterId: string, locked = false
): StorySeed {
  return { id: crypto.randomUUID(), title: title.trim(), placement, type, characterId, locked,
    setup: "", consequence: "", payoff: "" };
}
export function StorySeedsWorkspace({ seriesId, blueprint, onDirtyChange }: { seriesId: string; blueprint: SeriesBlueprint; onDirtyChange?: (dirty: boolean) => void }) {
  const [saved, setSaved] = useState<StoryPlan | null>(null);
  const [draft, setDraft] = useState<StorySeed[]>([]);
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [seedType, setSeedType] = useState<StorySeed["type"]>("EVENT");
  const [placement, setPlacement] = useState<StorySeed["placement"]>("UNPLACED");
  const [characterId, setCharacterId] = useState(blueprint.cast[0]?.id ?? "");
  const [setup, setSetup] = useState("");
  const [consequence, setConsequence] = useState("");
  const [payoff, setPayoff] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState<StoryPlanSaveInput | null>(null);
  const [reloadConfirm, setReloadConfirm] = useState(false);
  const [writingHint, setWritingHint] = useState(0);
  const url = "/api/series/" + encodeURIComponent(seriesId) + "/story-seeds";

  const load = useCallback(async () => {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.plan) {
      throw new Error(body?.error?.message ?? "Unable to load saved story seeds.");
    }
    const plan = body.plan as StoryPlan;
    setSaved(plan);
    setDraft(plan.seeds);
    setPending(null);
    setEditing(null);
    setNewTitle("");
    setSetup("");
    setConsequence("");
    setPayoff("");
    setAcknowledged(false);
    setReloadConfirm(false);
    setNotice("");
    setError("");
  }, [url]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        const body = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok || !body?.plan) {
          setError(body?.error?.message ?? "Story saving is not available in this environment.");
        } else {
          setSaved(body.plan as StoryPlan);
          setDraft((body.plan as StoryPlan).seeds);
        }
      } catch {
        if (active) setError("Unable to connect to your saved story plan.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void start();
    return () => { active = false; };
  }, [url]);

  const savedChanges = !!saved && JSON.stringify(saved.seeds) !== JSON.stringify(draft);
  const hasUnaddedIdea = Boolean(newTitle.trim() || setup.trim() || consequence.trim() || payoff.trim());
  const changed = savedChanges || hasUnaddedIdea;
  useEffect(() => {
    onDirtyChange?.(changed);
    return () => onDirtyChange?.(false);
  }, [changed, onDirtyChange]);
  useEffect(() => {
    if (!changed) return;
    const preventAccidentalLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventAccidentalLeave);
    return () => window.removeEventListener("beforeunload", preventAccidentalLeave);
  }, [changed]);
  const needsReview = !!saved && lockedSeedChanges(saved.seeds, draft);
  const lockedCount = draft.filter((seed) => seed.locked).length;
  const hint = useMemo(() => {
    const protagonist = blueprint.cast.find((member) => member.role === "PROTAGONIST") ?? blueprint.cast[0];
    const examples = [
      "What does " + (protagonist?.name ?? "your protagonist") + " stand to lose if the ending happens?",
      "Which early choice causes your midpoint revelation, rather than just preceding it?",
      "What important belief changes between the opening and finale?",
      "Who knows the truth before the audience does? When does that change?"
    ];
    return examples[writingHint % examples.length];
  }, [blueprint.cast, writingHint]);

  function update(id: string, patch: Partial<StorySeed>) {
    setDraft((previous) => previous.map((seed) => seed.id === id ? { ...seed, ...patch } : seed));
    setAcknowledged(false);
    setNotice("");
    setPending(null);
  }
  function addSeed() {
    if (!saved) return;
    const title = newTitle.trim();
    if (!title || title.length > 240) {
      setError("Give this event a title between 1 and 240 characters.");
      return;
    }
    if (draft.length >= 60) {
      setError("This version supports up to 60 story seeds.");
      return;
    }
    if (draft.some((seed) => seed.title.toLowerCase() === title.toLowerCase())) {
      setError("That moment is already in your story plan.");
      return;
    }
    const newSeed = { ...seedFrom(title, placement, seedType, characterId),
      setup: setup.trim(), consequence: consequence.trim(), payoff: payoff.trim() };
    setDraft((previous) => [...previous, newSeed]);
    setNewTitle("");
    setSetup("");
    setConsequence("");
    setPayoff("");
    setError("");
    setNotice("New seed is in your unsaved draft.");
    setPending(null);
  }
  function importOutline() {
    if (!saved || draft.length) return;
    const id = blueprint.cast.find((member) => member.role === "PROTAGONIST")?.id ?? characterId;
    setDraft([
      seedFrom(blueprint.season.beginning, "OPENING", "EVENT", id),
      seedFrom(blueprint.season.midpoint, "MIDPOINT", "REVEAL", id),
      seedFrom(blueprint.season.finale, "FINALE", "ENDING", id, true)
    ]);
    setAdvanced(true);
    setNotice("Three suggestions added to your draft from the existing season outline. Review before saving.");
  }
  async function persist(receipt: StoryPlanSaveInput) {
    setBusy(true);
    setError("");
    setNotice("");
    setPending(receipt);
    try {
      const response = await fetch(url, {
        method: "PUT",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt)
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.plan) {
        const code = body?.error?.code;
        if (response.status === 409) {
          setPending(null);
          setError(code === "STORY_LOCKED_CHANGE_REQUIRES_REVIEW"
            ? "A locked story seed needs review before this plan can be saved."
            : "Your saved story plan changed elsewhere. Your draft is still here. Reload only when you are ready to discard it.");
        } else if (response.status === 400) {
          setPending(null);
          setError(body?.error?.message ?? "Check your story details and try again.");
        } else {
          setError(body?.error?.message ?? "Save could not be confirmed. Retry the same request.");
        }
        return;
      }
      const plan = body.plan as StoryPlan;
      setSaved(plan);
      setDraft(plan.seeds);
      setPending(null);
      setAcknowledged(false);
      setEditing(null);
      setNotice("Story seeds saved. Reopen this show to continue where you left off.");
    } catch (caught) {
      setError("Save could not be confirmed. Your draft is still here. Retry the same request.");
    } finally {
      setBusy(false);
    }
  }
  function save() {
    if (!saved || busy || !savedChanges) return;
    if (needsReview && !acknowledged) {
      setError("Review and confirm changes to the locked story moments first.");
      return;
    }
    void persist({ requestId: crypto.randomUUID(), expectedRevision: saved.revision,
      acknowledgeLockedChanges: needsReview && acknowledged, seeds: draft });
  }
  function refresh() {
    if (changed && !reloadConfirm) { setReloadConfirm(true); return; }
    setBusy(true);
    void load().catch((caught) => setError(describeProblem(caught))).finally(() => setBusy(false));
  }
  if (loading) return <section aria-live="polite" className={styles.loading}>Opening your saved story plan…</section>;
  if (!saved) return <section className={styles.loading} role="alert"><h2>Story saving isn't connected yet</h2><p>{error}</p><p>The rest of the preview remains available without changing your show.</p><button type="button" onClick={() => { setLoading(true); setError(""); void load().catch((caught) => setError(describeProblem(caught))).finally(() => setLoading(false)); }}>Retry the Story tab</button></section>;

  return (
    <section className={base.page}>
      <div className={base.heading}>
        <span className={base.eyebrow}>STORY ARCHITECT · {blueprint.identity.title.toUpperCase()}</span>
        <h1>Make every moment <em>mean something.</em></h1>
        <p>Save the events you already know you want. Build backwards from your ending, connect the choices, and protect the moments that define your story.</p>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.stats}><strong>{draft.length} story seeds</strong><span>{lockedCount} locked · {changed ? "Unsaved changes" : saved.revision ? "Saved revision " + saved.revision : "New plan"}</span></div>
        <div className={styles.segment} aria-label="Story mode">
          <button type="button" aria-pressed={!advanced} className={!advanced ? styles.active : ""} onClick={() => setAdvanced(false)}>Guided</button>
          <button type="button" aria-pressed={advanced} className={advanced ? styles.active : ""} onClick={() => setAdvanced(true)}>Advanced</button>
        </div>
      </div>
      <div className={styles.workspace}>
        <div className={styles.editor}>
          <span className={base.eyebrow}>NEW STORY SEED</span>
          <h2>{advanced ? "Give this moment a purpose." : "What's a moment you know you want?"}</h2>
          <p>It can be a revelation, a character choice, a mystery, a funny scene, or even the final ending.</p>
          <label htmlFor="story-seed-title">Describe your moment</label>
          <textarea id="story-seed-title" rows={3} maxLength={240} value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="The protagonist discovers their mentor caused the war…"/>
          <div className={styles.fields}>
            <label>Who is this about?
              <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                {blueprint.cast.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            {advanced && <>
              <label>Event type
                <select value={seedType} onChange={(event) => setSeedType(event.target.value as StorySeed["type"])}>
                  {types.map((type) => <option key={type} value={type}>{type.toLowerCase()}</option>)}
                </select>
              </label>
              <label>Where does it happen?
                <select value={placement} onChange={(event) => setPlacement(event.target.value as StorySeed["placement"])}>
                  {placements.map((value) => <option key={value} value={value}>{value.toLowerCase()}</option>)}
                </select>
              </label>
            </>}
          </div>
          {advanced && <div className={styles.advancedFields}>
            <label>What sets this up?<textarea rows={2} maxLength={600} value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="What must happen beforehand?"/></label>
            <label>What changes because of this?<textarea rows={2} maxLength={600} value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder="How are the characters different afterward?"/></label>
            <label>What's the emotional payoff?<textarea rows={2} maxLength={600} value={payoff} onChange={(e) => setPayoff(e.target.value)} placeholder="Why should the audience care?"/></label>
          </div>}
          <div className={styles.actions}><small>Nothing becomes canon automatically.</small><button type="button" className={styles.primary} onClick={addSeed} disabled={busy}>Add to draft +</button></div>
        </div>
        <aside className={styles.assistant}>
          <span className={base.eyebrow}>DIRECTOR'S NOTEBOOK</span>
          <div className={styles.glow}>✦</div>
          <h3>Ask a better story question.</h3>
          <p>Think like a showrunner: events matter because of what they force your characters to become.</p>
          <div className={styles.note}>{hint}</div>
          <button type="button" onClick={() => setWritingHint((v) => v + 1)}>Another writing prompt ↗</button>
          <p className={styles.disclaimer}>Curated writing prompts only. Live AI story chat is not enabled.</p>
        </aside>
      </div>
      {!draft.length && <div className={styles.empty}>
        <div className={styles.glow}>◇</div>
        <h2>Your story starts with one turning point.</h2>
        <p>Or start with three moments already in your existing season outline. They will be suggested draft seeds, not automatically made canon.</p>
        <button className={styles.secondary} type="button" onClick={importOutline}>Start from my season outline</button>
      </div>}
      {!!draft.length && <>
        <div className={styles.sectionHeading}><h2>Your story map</h2><p>Move, refine and protect each turning point. All changes stay in your draft until saved.</p></div>
        <div className={styles.timeline}>
          {placements.map((group) => <div className={styles.column} key={group}>
            <h3>{group === "UNPLACED" ? "IDEAS TO PLACE" : group}</h3>
            <div className={styles.stack}>{draft.filter((seed) => seed.placement === group).map((seed) =>
              <article className={styles.card} key={seed.id}>
                <div className={styles.cardTop}><span>{seed.type}</span><span>{blueprint.cast.find((member) => member.id === seed.characterId)?.name ?? "Character"}</span></div>
                <p>{seed.title}</p>
                {seed.consequence && <small>Change: {seed.consequence}</small>}
                <div className={styles.cardActions}>
                  <button type="button" aria-pressed={seed.locked} disabled={busy} onClick={() => update(seed.id, { locked: !seed.locked })}>{seed.locked ? "🔒 Locked" : "🔓 Lock"}</button>
                  <button type="button" disabled={busy} onClick={() => setEditing(editing === seed.id ? null : seed.id)}>{editing === seed.id ? "Close" : "Edit"}</button>
                  <button type="button" disabled={busy} onClick={() => {
                    setDraft((previous) => previous.filter((entry) => entry.id !== seed.id));
                    setAcknowledged(false); setPending(null);
                  }}>Remove</button>
                </div>
                {editing === seed.id && <div className={styles.editCard}>
                  <label>Moment<textarea maxLength={240} rows={2} value={seed.title} onChange={(e) => update(seed.id, {title:e.target.value})}/></label>
                  <label>Placement<select value={seed.placement} onChange={(e) => update(seed.id, { placement:e.target.value as StorySeed["placement"] })}>{placements.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                  <label>Setup<textarea maxLength={600} rows={2} value={seed.setup} onChange={(e) => update(seed.id, { setup:e.target.value })}/></label>
                  <label>Consequence<textarea maxLength={600} rows={2} value={seed.consequence} onChange={(e) => update(seed.id, { consequence:e.target.value })}/></label>
                  <label>Payoff<textarea maxLength={600} rows={2} value={seed.payoff} onChange={(e) => update(seed.id, { payoff:e.target.value })}/></label>
                </div>}
              </article>)}
              {!draft.some((seed) => seed.placement === group) && <span className={styles.noCards}>Space for the next idea.</span>}
            </div>
          </div>)}
        </div>
      </>}
      <div className={styles.savePanel}>
        <div><strong>{changed ? "Your changes need saving" : "Your story plan is up to date"}</strong><p>{saved.revision ? "Last saved revision " + saved.revision : "This series has no saved story seeds yet."} Existing episodes, frames and canon will not be rewritten.</p></div>
        {needsReview && <label className={styles.review}><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)}/> I reviewed the changes to my locked story moments and approve this new planning version.</label>}
        <div className={styles.saveActions}>
          {pending ? <button type="button" className={styles.primary} disabled={busy} onClick={() => void persist(pending)}>{busy ? "Checking…" : "Retry exact save"}</button>
            : <button type="button" className={styles.primary} disabled={!savedChanges || busy} onClick={save}>{busy ? "Saving…" : "Save story plan"}</button>}
          <button className={styles.secondary} type="button" disabled={busy} onClick={refresh}>{reloadConfirm ? "Confirm discard & reload" : "Reload saved plan"}</button>
          {reloadConfirm && <button type="button" onClick={() => setReloadConfirm(false)}>Keep my draft</button>}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {notice && <p className={styles.success} role="status">{notice}</p>}
        <small>Only the signed-in creator can read or save this planning data. No AI generation or production jobs run here.</small>
      </div>
    </section>
  );
}
