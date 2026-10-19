"use client";
import { useRef, useState } from "react";
import type { ProductionReferenceRecord } from "@/lib/production-references/types";
import type { SheetViewRequest } from "@/lib/production-references/sheet-view-schema";
import styles from "./ProductionReferenceStudio.module.css";

export function SheetViewImporter({ seriesId, characterId, references, onSaved }: {
  seriesId: string; characterId: string; references: ProductionReferenceRecord[]; onSaved: () => Promise<void>;
}) {
  const sources = references.filter(r => r.characterId === characterId && r.type === "CHARACTER" &&
    r.referenceRole === "OTHER" && !r.benchmarkOnly && !["ARCHIVED", "REJECTED"].includes(r.status));
  const [sourceId, setSourceId] = useState("");
  const source = sources.find(r => r.id === sourceId);
  const [crop, setCrop] = useState({ left: 0, top: 0, width: 128, height: 128 });
  const [label, setLabel] = useState("Front view");
  const [role, setRole] = useState<SheetViewRequest["referenceRole"]>("FULL_BODY");
  const [preview, setPreview] = useState<{ url: string; revision: string } | null>(null);
  const [loaded, setLoaded] = useState(false), [inspected, setInspected] = useState(false);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [message, setMessage] = useState("");
  const lock = useRef(false);
  function invalidate() { setPreview(null); setLoaded(false); setInspected(false); setMessage(""); }
  async function submit(action: "preview" | "save") {
    if (lock.current || !source || uncertain || (action === "save" && (!preview || !inspected || !loaded))) return;
    lock.current = true; setBusy(true); setMessage("");
    let saveMayHaveSucceeded = false;
    try {
      const body: SheetViewRequest = { action, sourceChecksum: source.checksum, crop, label, referenceRole: role,
        ...(action === "save" ? { expectedVisualRevision: preview!.revision } : {}) };
      saveMayHaveSucceeded = action === "save";
      const response = await fetch(`/api/series/${seriesId}/production-references/${source.id}/views`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) {
        // A server error can occur after insertion. Never retry a save automatically.
        if (action === "save" && response.status >= 500) throw new Error("Save uncertain.");
        saveMayHaveSucceeded = false; invalidate();
        setMessage(result.error?.code ?? "View could not be prepared. Preview again."); return;
      }
      if (action === "preview") {
        if (!result.previewUrl || !result.visualRevision) throw new Error("Preview unavailable.");
        setPreview({ url: result.previewUrl, revision: result.visualRevision }); setLoaded(false); setInspected(false);
      } else {
        if (!result.reference?.id) throw new Error("Save uncertain.");
        saveMayHaveSucceeded = false; invalidate();
        setMessage("View saved for separate rights and identity review. No approval or generation started.");
        await onSaved();
      }
    } catch {
      if (saveMayHaveSucceeded) { setUncertain(true); setMessage("Save response uncertain. Reload and inspect saved references before making another view. No automatic retry."); }
      else setMessage("Connection failed. Your source and crop settings remain available.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.sheetImporter} aria-label="Import views from a sheet">
    <h3>Import individual views from a sheet</h3>
    <p>Upload the complete original below with role OTHER first. It stays unchanged. Select a rectangle in pixels, preview it, then explicitly save a separate view for review. Rights are inherited from the source.</p>
    <fieldset disabled={busy || uncertain} className={styles.form}>
      <legend>Choose a source and crop</legend>
      <label>Source sheet<select value={sourceId} onChange={e => { invalidate(); setSourceId(e.target.value); }}>
        <option value="">Select a saved source sheet</option>{sources.map(r => <option value={r.id} key={r.id}>Source {r.id.slice(0, 8)} · {r.visualMetadata.width}×{r.visualMetadata.height}</option>)}
      </select></label>
      <label>View label<input value={label} maxLength={80} onChange={e => { invalidate(); setLabel(e.target.value); }} /></label>
      <label>View role<select value={role} onChange={e => { invalidate(); setRole(e.target.value as typeof role); }}>
        {(["FULL_BODY", "PROFILE", "EXPRESSION", "COSTUME", "TURNAROUND"] as const).map(value => <option key={value}>{value}</option>)}
      </select></label>
      {(["left", "top", "width", "height"] as const).map(key => <label key={key}>Crop {key}<input type="number" step="1" min={key === "left" || key === "top" ? 0 : 16} max={key === "left" || key === "top" ? 16384 : 4096} value={crop[key]} onChange={e => { invalidate(); setCrop({ ...crop, [key]: Number(e.target.value) }); }} /></label>)}
      <button type="button" disabled={!source || !label.trim()} onClick={() => void submit("preview")}>Preview crop</button>
    </fieldset>
    {source ? <><p>Source dimensions: {source.visualMetadata.width} × {source.visualMetadata.height} pixels. Coordinates start at its top-left corner. The outline shows your selected rectangle.</p><div className={styles.sheetCanvas}><img className={styles.sheetPreview} src={source.assetUrl} alt="Original sheet for selecting crop coordinates" referrerPolicy="no-referrer" /><div aria-hidden="true" className={styles.cropOutline} style={{ left: `${100 * crop.left / source.visualMetadata.width}%`, top: `${100 * crop.top / source.visualMetadata.height}%`, width: `${100 * crop.width / source.visualMetadata.width}%`, height: `${100 * crop.height / source.visualMetadata.height}%` }} /></div></> : null}
    {preview ? <><img className={styles.cropPreview} src={preview.url} alt="Proposed cropped character view" onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setInspected(false); }} />
      <label><input type="checkbox" disabled={!loaded || busy || uncertain} checked={inspected} onChange={e => setInspected(e.target.checked)} />I inspected this crop. Save it as a new reference for review.</label>
      <button type="button" disabled={!loaded || !inspected || busy || uncertain} onClick={() => void submit("save")}>Save view for review</button></> : null}
    {message ? <p role="status">{message}</p> : null}
    <p>After separately approving rights, use <a href={`/series/${seriesId}/cast/${characterId}/reference-binding`}>Review identity reference</a> to bind an eligible full-body or turnaround view to the current character revision. Profile and expression views are supporting references.</p>
  </section>;
}
