"use client";

import type { SceneScript } from "@/lib/scripts/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import type { VisualPlan, VisualPlanSummary } from "@/lib/visual-planning/types";
import styles from "./VisualPlanningWorkspace.module.css";

export function VisualPlanningWorkspace({
  plan,
  versions,
  script,
  series
}: {
  plan: VisualPlan;
  versions: VisualPlanSummary[];
  script: SceneScript;
  series: SeriesBlueprint;
}) {
  const castById = new Map(series.cast.map((member) => [member.id, member.name]));
  const blockById = new Map(script.blocks.map((block) => [block.id, block]));

  const describeBlock = (blockId: string) => {
    const block = blockById.get(blockId);
    if (!block) return "Source moment";
    if (block.type === "DIALOGUE") {
      return (castById.get(block.characterId) ?? "Character") + ': "' + block.text + '"';
    }
    if (block.type === "REACTION") {
      return (castById.get(block.characterId) ?? "Character") + ": " + block.text;
    }
    if (block.type === "ACTION") return block.text;
    return "Beat: " + block.purpose;
  };

  return (
    <main className={styles.root}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Visual plan</span>
          <h1>{plan.identity.title}</h1>
          <p>{plan.visualIntent.visualThesis}</p>
        </div>
        <button type="button" className={styles.primaryButton} disabled>
          Generate Storyboard
        </button>
      </header>

      <section className={styles.summaryGrid}>
        <article>
          <span className={styles.eyebrow}>Creative DNA</span>
          <strong>{series.creativeDNA.visualStyle.description}</strong>
          <p>{series.creativeDNA.visualStyle.colorLanguage}</p>
          <p>{series.creativeDNA.visualStyle.lighting}</p>
        </article>
        <article>
          <span className={styles.eyebrow}>Scene staging</span>
          <strong>{plan.staging.geography}</strong>
          <p>{plan.visualIntent.pacingIntent}</p>
        </article>
      </section>

      <div className={styles.versionRow}>
        <span>Visual plan version</span>
        <strong>{versions.find((item) => item.version === plan.version)?.status === "APPROVED" ? "Approved" : "Draft"} v{plan.version}</strong>
      </div>

      <section className={styles.positions}>
        <span className={styles.eyebrow}>Character positions</span>
        <div className={styles.positionGrid}>
          {plan.staging.characterPositions.map((position) => (
            <article key={position.characterId}>
              <strong>{castById.get(position.characterId) ?? position.characterId}</strong>
              <p>{position.initialPosition}</p>
              <small>{position.movementIntent}</small>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.timeline}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Visual beats</span>
          <strong>{plan.visualBeats.length} storytelling units</strong>
        </div>

        {plan.visualBeats.map((beat, index) => (
          <article className={styles.beatCard} key={beat.id}>
            <div className={styles.beatIndex}>{String(index + 1).padStart(2, "0")}</div>
            <div className={styles.beatBody}>
              <h2>{beat.purpose}</h2>
              <p className={styles.storyMoment}>{beat.storyMoment}</p>
              <dl>
                <div><dt>Focus</dt><dd>{beat.focalCharacterIds.map((id) => castById.get(id) ?? id).join(" → ") || "Environment"}</dd></div>
                <div><dt>Composition</dt><dd>{beat.compositionIntent}</dd></div>
                <div><dt>Staging</dt><dd>{beat.staging}</dd></div>
                <div><dt>Emotion</dt><dd>{beat.emotionalFunction}</dd></div>
                <div><dt>Motion</dt><dd>{beat.motionIntent}</dd></div>
                <div><dt>Transition</dt><dd>{beat.transitionIntent}</dd></div>
                <div><dt>Duration</dt><dd>{beat.estimatedDurationSeconds.toFixed(1)} sec</dd></div>
              </dl>
              <div className={styles.sourceBox}>
                <span>Source</span>
                {beat.sourceScriptBlockIds.map((blockId) => <p key={blockId}>{describeBlock(blockId)}</p>)}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.continuity}>
        <span className={styles.eyebrow}>Continuity notes</span>
        <div className={styles.continuityGrid}>
          <article>
            <strong>Characters</strong>
            {plan.continuityChecks.characterConsistency.map((item) => <p key={item}>{item}</p>)}
          </article>
          <article>
            <strong>Environment</strong>
            {plan.continuityChecks.environmentConsistency.map((item) => <p key={item}>{item}</p>)}
          </article>
        </div>
      </section>
    </main>
  );
}
