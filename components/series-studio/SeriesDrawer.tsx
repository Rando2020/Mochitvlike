"use client";

import { useEffect, useRef } from "react";
import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./EpisodeBoard.module.css";

// Native modal dialog supplies focus containment and makes the background inert.
export function SeriesDrawer({ blueprint, open, onClose }: {
  blueprint: SeriesBlueprint; open: boolean; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  return <dialog ref={dialog} className={styles.drawer} aria-labelledby="series-drawer-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={onClose}>
    <header className={styles.drawerHeader}>
      <div><span className={styles.eyebrow}>Your series · Story context</span><h2 id="series-drawer-title">{blueprint.identity.title}</h2></div>
      <button type="button" autoFocus onClick={onClose} aria-label="Close your series">×</button>
    </header>
    <p className={styles.note}>{blueprint.identity.logline}</p>
    <section><h3>Cast</h3><ul className={styles.contextList}>{blueprint.cast.map(member => <li key={member.id}>
      <span className={styles.eyebrow}>{member.role.replaceAll("_", " ")}</span><h4>{member.name}</h4><p>{member.summary}</p><p><strong>Wants: </strong>{member.want}</p>
    </li>)}</ul></section>
    <section><h3>Locations</h3>{blueprint.world.locations.length ? <ul className={styles.contextList}>{blueprint.world.locations.map(location => <li key={location.id}><h4>{location.name}</h4><p>{location.description}</p></li>)}</ul> : <p className={styles.note}>No locations established yet.</p>}</section>
    <section><h3>Visual direction</h3><p>{blueprint.creativeDNA.visualStyle.description}</p>
      <dl className={styles.context}><div><dt>Color</dt><dd>{blueprint.creativeDNA.visualStyle.colorLanguage}</dd></div><div><dt>Lighting</dt><dd>{blueprint.creativeDNA.visualStyle.lighting}</dd></div><div><dt>Camera</dt><dd>{blueprint.creativeDNA.visualStyle.cameraLanguage}</dd></div></dl>
    </section>
  </dialog>;
}
