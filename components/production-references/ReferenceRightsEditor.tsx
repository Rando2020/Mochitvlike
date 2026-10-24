"use client";
import { useEffect, useRef, useState } from "react";
import type { ProductionReferenceRecord, ReferencePermissions } from "@/lib/production-references/types";
import styles from "./ReferenceRightsEditor.module.css";

const permissionLabels: Record<keyof ReferencePermissions, string> = {
  productionUse: "Production use", commercialUse: "Commercial use",
  modelConditioning: "Model conditioning", redistribution: "Redistribution"
};
const encode = (value: boolean | null) => value === null ? "unknown" : value ? "allowed" : "denied";
const decode = (value: string) => value === "unknown" ? null : value === "allowed";

export function ReferenceRightsEditor({ seriesId, reference, onSaved }: {
  seriesId: string; reference: ProductionReferenceRecord; onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [provenance, setProvenance] = useState(() => structuredClone(reference.provenance));
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const editable = ["UPLOADED", "REVIEW_REQUIRED"].includes(reference.status);
  if (!editable) return null;
  function cancel() {
    if (lock.current) return;
    setOpen(false); setProvenance(structuredClone(reference.provenance));
    setAcknowledged(false); setMessage("");
  }
  async function refresh() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await onSaved();
      if (mounted.current) {
        // If the server revision changed, the parent remounts this editor. If it
        // did not, a successful reload has confirmed the original saved rights.
        setProvenance(structuredClone(reference.provenance)); setAcknowledged(false);
        setNeedsRefresh(false); setMessage(""); setOpen(false);
      }
    }
    catch { if (mounted.current) setMessage("Could not reload references. Try reloading again before editing or approving."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || needsRefresh || !acknowledged) return;
    lock.current = true; setBusy(true); setMessage("");
    let saved = false;
    try {
      const response = await fetch(`/api/series/${seriesId}/production-references/${reference.id}/rights`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: reference.updatedAt, provenance })
      });
      if (!mounted.current) return;
      if (!response.ok) {
        if (response.status >= 500) throw new Error("UNCERTAIN");
        if ([404, 409, 412].includes(response.status)) {
          setNeedsRefresh(true); setMessage("This reference changed or is no longer editable. Reload references before reviewing again.");
        } else setMessage(response.status === 401 ? "Your session ended. Sign in again before saving rights." : "Rights could not be saved. Review the fields and try again.");
        return;
      }
      saved = true; setNeedsRefresh(true);
      setMessage("Rights saved. Approval and identity binding are still separate actions.");
      await onSaved();
      if (mounted.current) setOpen(false);
    } catch {
      if (mounted.current) {
        setNeedsRefresh(true);
        setMessage(saved ? "Rights were saved, but references could not reload. Reload before approving; do not save again." : "Save response uncertain. Reload references to inspect the saved rights before editing again. No automatic retry.");
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  if (!open) return <button className={styles.openButton} type="button" onClick={() => setOpen(true)}>Review rights</button>;
  return <form className={styles.editor} aria-label="Review reference rights" onSubmit={event => void save(event)}>
    <h4>Review reference rights</h4>
    <p>Record only rights you can verify. Unknown or denied required permissions keep this reference blocked from production. Saving does not approve or bind it.</p>
    <fieldset disabled={busy || needsRefresh}>
      <legend>Rights declaration</legend>
      <p>Source: {reference.source.replaceAll("_", " ")}</p>
      {([ ["creatorNameOrId", "Creator / rights holder"], ["licenseIdOrDescription", "License or rights record"], ["sourceUrlOrRecord", "Source URL or record"] ] as const).map(([key, label]) => <label key={key}>{label}<input value={provenance[key] ?? ""} maxLength={2000} onChange={event => { setAcknowledged(false); setProvenance({ ...provenance, [key]: event.target.value || null }); }} /></label>)}
      {(Object.keys(permissionLabels) as (keyof ReferencePermissions)[]).map(key => <label key={key}>{permissionLabels[key]}<select value={encode(provenance.permissions[key])} onChange={event => { setAcknowledged(false); setProvenance({ ...provenance, permissions: { ...provenance.permissions, [key]: decode(event.target.value) } }); }}><option value="unknown">Unknown / not yet reviewed</option><option value="allowed">Allowed — I can verify this right</option><option value="denied">Not allowed</option></select></label>)}
      {reference.source === "SYNTHETIC" ? <label>Created specifically for this series<select value={encode(provenance.projectSpecific)} onChange={event => { setAcknowledged(false); setProvenance({ ...provenance, projectSpecific: decode(event.target.value) }); }}><option value="unknown">Unknown / not yet reviewed</option><option value="allowed">Yes</option><option value="denied">No</option></select></label> : null}
      <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />I confirm these rights declarations are accurate.</label>
      <button type="submit" disabled={!acknowledged}>Save rights for review</button>
    </fieldset>
    {needsRefresh ? <button type="button" disabled={busy} onClick={() => void refresh()}>Reload references</button> : <button type="button" disabled={busy} onClick={cancel}>Cancel rights review</button>}
    {message ? <p role="status">{message}</p> : null}
  </form>;
}
