"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { CastMember } from "@/lib/series/types";
import type { DirectionReview } from "@/lib/character-direction/edit";
import { EMPTY_CHARACTER_DIRECTION, type CharacterDirection } from "@/lib/character-direction/schema";
import { CharacterDirectionControls, DIRECTION_GROUP_LABELS } from "@/components/show-creation/CharacterDirectionControls";
import styles from "./CharacterDirectionEditor.module.css";

export function CharacterDirectionEditor({ seriesId, member, archived }: { seriesId: string; member: CastMember; archived: boolean }) {
  const [direction, setDirection] = useState<CharacterDirection>(member.generationDirection ?? EMPTY_CHARACTER_DIRECTION);
  const [review, setReview] = useState<DirectionReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const lock = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  async function submit(action: "review" | "save") {
    if (lock.current || archived || (action === "save" && (!review || !acknowledged))) return;
    lock.current = true; setBusy(true); setError("");
    let uncertainSave = action === "save";
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(seriesId)}/cast/${encodeURIComponent(member.id)}/direction`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "review" ? { action, direction } : {
          action, direction: review!.proposed, expectedRevision: review!.expectedRevision, impactRevision: review!.impactRevision,
          reviewId: review!.reviewId, acknowledgeImpact: true
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 || response.status === 401 || response.status === 404) { uncertainSave = false; setReview(null); setUncertain(false); setAcknowledged(false); }
        else if (action === "save") setUncertain(true);
        throw new Error(payload.error?.message ?? "The request could not be confirmed.");
      }
      if (action === "review") {
        if (!payload.review) throw new Error("Review could not be confirmed.");
        setReview(payload.review); setAcknowledged(false); setUncertain(false);
        requestAnimationFrame(() => reviewHeading.current?.focus());
      } else {
        if (payload.saved !== true) throw new Error("Save could not be confirmed.");
        setDirection(payload.direction); setSaved(true); setUncertain(false);
      }
    } catch (caught) {
      if (uncertainSave) setUncertain(true);
      setError(caught instanceof Error ? caught.message : "The request could not be confirmed.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <main className={styles.editor}>
    <Link href={`/series/${encodeURIComponent(seriesId)}`}>← Back to studio</Link>
    <p className={styles.eyebrow}>CAST DIRECTION · REVIEW BEFORE SAVE</p>
    <h1>{member.name}</h1><p>{member.summary}</p>
    <p>Your character's name, goals, story, and original description stay unchanged. No assets are regenerated, deleted, or unapproved by this editor.</p>
    {archived ? <p role="status">This series is archived. Restore it before editing.</p> : null}
    {saved ? <section role="status"><h2>Direction saved</h2><p>Future preparation uses these choices. Previous outputs and approved references remain unchanged.</p>
      {review?.visualChanged ? <p>New production frames are paused until revision-bound reference review is implemented. Uploading another reference alone does not clear this pause.</p> : null}
      <Link href={`/series/${encodeURIComponent(seriesId)}`}>Return to studio</Link></section> : <>
      <CharacterDirectionControls existing value={direction} disabled={busy || archived || !!review} onChange={value => { setDirection(value); setSaved(false); }} />
      {!review ? <button type="button" disabled={busy || archived} onClick={() => void submit("review")}>{busy ? "Checking production work…" : "Review changes"}</button> : <section aria-labelledby="direction-review-heading">
        <h2 id="direction-review-heading" tabIndex={-1} ref={reviewHeading}>Review proposed changes</h2>
        {review.changes.length ? <div className={styles.tableScroll}><table><caption>Current direction → proposed direction</caption><thead><tr><th>Area</th><th>Current</th><th>Proposed</th></tr></thead>
          <tbody>{review.changes.map(change => <tr key={change.group}><th scope="row">{DIRECTION_GROUP_LABELS[change.group]}</th><td>{change.before}</td><td>{change.after}</td></tr>)}</tbody></table></div> : <p>No direction changes.</p>}
        <h3>Existing production work to review</h3>
        <p>Counts are conservative, series-wide candidates, not proof that every item uses this character. References and performance bibles are character-specific. All remain preserved, including queued work.</p>
        <ul>{review.impact.map(item => <li key={item.label}>{item.label}: {item.count}</li>)}</ul>
        <p>Personality changes guide newly prepared scenes and scripts. Voice changes guide newly prepared voice casts and speech. Existing plans and queued jobs keep their saved inputs; revise them explicitly if needed.</p>
        {review.visualChanged ? <p className={styles.warning}>Body or clothing changed. Approved references will not be overwritten. New production frames for this character will be blocked until revision-bound reference review is implemented.</p> : null}
        <label className={styles.ack}><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} />I reviewed the changes and impact. Keep all existing production work.</label>
        <div className={styles.actions}><button type="button" disabled={busy || !acknowledged || !review.changes.length} onClick={() => void submit("save")}>{busy ? "Saving…" : uncertain ? "Retry reviewed save" : "Save direction"}</button>
          <button type="button" disabled={busy || uncertain} onClick={() => { setReview(null); setAcknowledged(false); }}>Back to edit</button></div>
      </section>}
    </>}
    {error ? <p role="alert">{error}</p> : null}
    {uncertain && review && !saved ? <p role="status">The save response was uncertain. Retry this exact proposal to confirm it before making another edit.</p> : null}
  </main>;
}
