"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReferenceBindingReview, ReferenceCandidate } from "@/lib/character-direction/review-reference-binding";
import { CharacterDirectionSummary } from "@/components/show-creation/CharacterDirectionControls";
import styles from "./CharacterDirectionEditor.module.css";

export function ReferenceBindingEditor({ seriesId, characterId, name, description, candidates, visualRevision, currentReferenceId, archived }: {
  seriesId: string; characterId: string; name: string; description: string; candidates: ReferenceCandidate[];
  visualRevision: string; currentReferenceId: string | null; archived: boolean;
}) {
  const [referenceId, setReferenceId] = useState(candidates.find(candidate => candidate.id === currentReferenceId)?.id ?? candidates[0]?.id ?? "");
  const [review, setReview] = useState<ReferenceBindingReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [approved, setApproved] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const studioUrl = `/series/${encodeURIComponent(seriesId)}`;
  async function submit(action: "review" | "approve") {
    if (lock.current || archived || !referenceId || (action === "approve" && (!review || !acknowledged))) return;
    lock.current = true; setBusy(true); setError("");
    let uncertainApproval = action === "approve";
    try {
      const response = await fetch(`/api/series/${encodeURIComponent(seriesId)}/cast/${encodeURIComponent(characterId)}/reference-binding`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "review" ? { action, referenceId } : {
          action, referenceId: review!.reference.id, expectedRevision: review!.expectedRevision, visualRevision: review!.visualRevision,
          impactRevision: review!.impactRevision, reviewId: review!.reviewId, acknowledgeIdentity: true
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        if ([400, 401, 404, 409].includes(response.status)) { uncertainApproval = false; setReview(null); setAcknowledged(false); setUncertain(false); }
        throw new Error(payload.error?.message ?? "Reference review could not be confirmed.");
      }
      if (action === "review") {
        if (!payload.review?.previewUrl) throw new Error("The reference preview could not be loaded. Nothing was approved.");
        setReview(payload.review); setAcknowledged(false); setUncertain(false); setPreviewLoaded(false);
        requestAnimationFrame(() => heading.current?.focus());
      } else {
        if (payload.approved !== true) throw new Error("Approval could not be confirmed.");
        setApproved(true); setUncertain(false);
      }
    } catch (caught) {
      if (uncertainApproval) setUncertain(true);
      setError(caught instanceof Error ? caught.message : "Reference review could not be confirmed.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <main className={styles.editor}>
    <Link href={studioUrl}>← Back to studio</Link><p className={styles.eyebrow}>CAST REFERENCES · REVIEW BEFORE APPROVAL</p>
    <h1>Review identity for {name}</h1><p>{description}</p>
    <p>Bind an already-approved reference to this character's current visual revision. The image, original approval, previous bindings, and historical outputs stay unchanged.</p>
    <p>Only confirm if the image still matches their identity, current body build, and clothing. This is your visual review, not an automatic AI match.</p>
    <p>Current visual revision: <code>{visualRevision.slice(0, 12)}</code>{currentReferenceId ? " · A matching saved binding exists; reference validity will still be checked." : " · No matching saved binding."}</p>
    {archived ? <p role="status">This series is archived. Restore it before approving a binding.</p> : null}
    {approved ? <section role="status"><h2>Reference binding approved</h2><p>New frame preparation can use this identity reference while its approval, version, checksum, rights, and model compatibility remain valid. Existing plans and queued jobs are unchanged. No generation was started.</p><Link href={studioUrl}>Return to studio</Link></section> : <>
      <label>Approved identity reference<select aria-label="Approved identity reference" value={referenceId} disabled={busy || !!review || archived} onChange={event => setReferenceId(event.target.value)}>
        <option value="">Choose a reference</option>{candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.role.replaceAll("_", " ")} · v{candidate.version} · {candidate.id.slice(0, 8)}</option>)}
      </select></label>
      {!candidates.length ? <p role="status">No eligible approved primary, full-body, or turnaround reference. Prepare and approve a reference in <Link href={`${studioUrl}/references`}>Reference Studio</Link>, then reload this page. Do not archive an existing asset just to use this flow.</p> : null}
      {!review ? <div className={styles.actions}><button type="button" disabled={busy || archived || !referenceId} onClick={() => void submit("review")}>{busy ? "Checking reference and impact…" : "Preview binding and impact"}</button><button type="button" disabled={busy} onClick={() => router.refresh()}>Reload references</button></div> : <section aria-labelledby="binding-review-heading">
        <h2 id="binding-review-heading" tabIndex={-1} ref={heading}>Review proposed identity binding</h2>
        {review.previewUrl ? <Image unoptimized referrerPolicy="no-referrer" src={review.previewUrl} alt={`${review.characterName} approved reference for identity review`} width={review.reference.width} height={review.reference.height} className={styles.preview} onLoad={() => setPreviewLoaded(true)} onError={() => { setPreviewLoaded(false); if (!busy && !uncertain) setAcknowledged(false); setError("Reference preview expired or failed. Return to selection for a fresh review, or confirm an uncertain approval with the exact retry."); }} /> : null}
        <p>Source: {review.reference.role.replaceAll("_", " ")} → identity reference for this revision only.</p>
        <h3>Current character appearance</h3><p>{review.visualConcept}</p><p>{review.visualDescription}</p>
        {review.alreadyCurrent ? <p role="status">This exact reference version is already bound to the current visual revision. No approval change is needed.</p> : null}
        <dl><dt>Reference</dt><dd>{review.reference.id} · version {review.reference.version}</dd><dt>Visual revision</dt><dd><code>{review.visualRevision}</code></dd><dt>Image checksum</dt><dd><code>{review.reference.checksum}</code></dd><dt>Previous current binding</dt><dd>{review.currentReferenceId ?? "None for this visual revision"}</dd></dl>
        <CharacterDirectionSummary direction={review.direction} />
        <h3>Existing production work stays preserved</h3><p>Counts are conservative series-wide candidates, except character-specific references and performance bibles. A new binding affects only newly prepared frames. Existing frames are not regenerated and queued jobs keep their saved inputs.</p>
        <ul>{review.impact.map(item => <li key={item.label}>{item.label}: {item.count}</li>)}</ul>
        <label className={styles.ack}><input type="checkbox" disabled={busy || !previewLoaded || uncertain} checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />I inspected this image and confirm it matches the current identity, body build, and clothing. Preserve existing assets and outputs.</label>
        <div className={styles.actions}><button type="button" disabled={busy || !!review.alreadyCurrent || !acknowledged || (!previewLoaded && !uncertain)} onClick={() => void submit("approve")}>{busy ? "Approving binding…" : uncertain ? "Retry reviewed approval" : "Approve identity binding"}</button>
          <button type="button" disabled={busy || uncertain} onClick={() => { setReview(null); setAcknowledged(false); }}>Back to selection</button></div>
      </section>}
    </>}
    {error ? <p role="alert">{error}</p> : null}
    {uncertain && review && !approved ? <p role="status">Approval response was uncertain. Retry this exact reviewed binding before changing the selection.</p> : null}
  </main>;
}
