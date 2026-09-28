"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SceneScript, ScriptSummary } from "@/lib/scripts/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./ScriptWorkspace.module.css";

export function ScriptWorkspace({
  script,
  versions,
  series
}: {
  script: SceneScript;
  versions: ScriptSummary[];
  series: SeriesBlueprint;
}) {
  const router = useRouter();
  const [checksOpen, setChecksOpen] = useState(false);
  const castById = new Map(series.cast.map((member) => [member.id, member.name]));

  const changeVersion = (version: number) => {
    const target = versions.find((item) => item.version === version);
    if (!target || target.id === script.id) return;
    router.push(`/series/${script.seriesId}/scenes/${script.sceneId}/scripts/${target.id}`);
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Scene script</span>
          <h1>{script.identity.title}</h1>
          <p>{script.estimatedDurationSeconds}s estimated</p>
        </div>
        <button type="button" className={styles.primaryButton} disabled>
          Plan Visuals
        </button>
      </header>

      <div className={styles.versionRow}>
        <label htmlFor="script-version">Version</label>
        <select
          id="script-version"
          value={script.version}
          onChange={(event) => changeVersion(Number(event.target.value))}
        >
          {versions.map((item) => (
            <option key={item.id} value={item.version}>
              {item.status === "APPROVED" ? "Approved" : "Draft"} v{item.version}
            </option>
          ))}
        </select>
      </div>

      <article className={styles.script}>
        {script.blocks.map((block) => {
          if (block.type === "ACTION") {
            return <p key={block.id} className={styles.action}>{block.text}</p>;
          }

          if (block.type === "DIALOGUE") {
            return (
              <section key={block.id} className={styles.dialogue}>
                <strong>{castById.get(block.characterId) ?? "Character"}</strong>
                {block.deliveryIntent ? <span>{block.deliveryIntent}</span> : null}
                <p>{block.text}</p>
              </section>
            );
          }

          if (block.type === "REACTION") {
            return (
              <p key={block.id} className={styles.reaction}>
                <strong>{castById.get(block.characterId) ?? "Character"}</strong> {block.text}
              </p>
            );
          }

          return (
            <div key={block.id} className={styles.pause}>
              <span>{block.durationHint.toLowerCase()} beat</span>
              <p>{block.purpose}</p>
            </div>
          );
        })}
      </article>

      <section className={styles.checks}>
        <button
          type="button"
          className={styles.checksButton}
          aria-expanded={checksOpen}
          onClick={() => setChecksOpen((value) => !value)}
        >
          Story Checks
          <span aria-hidden="true">{checksOpen ? "−" : "+"}</span>
        </button>

        {checksOpen ? (
          <div className={styles.checkGrid}>
            <div>
              <strong>Required change</strong>
              <span>{script.endingStateVerification.requiredStoryChangeAchieved ? "Achieved" : "Needs work"}</span>
            </div>
            <div>
              <strong>Continuity</strong>
              <span>{script.continuityVerification.contradictionsDetected.length === 0 ? "Clear" : "Review"}</span>
            </div>
            <div>
              <strong>Protected mysteries</strong>
              <span>{script.continuityVerification.protectedMysteriesPreserved.length > 0 ? "Preserved" : "None required"}</span>
            </div>
            <div>
              <strong>Estimated duration</strong>
              <span>{script.estimatedDurationSeconds}s</span>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
