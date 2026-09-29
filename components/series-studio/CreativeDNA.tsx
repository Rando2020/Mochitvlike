import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

function Meter({ label, value }: { label: string; value: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={styles.meterBlock}>
      <div className={styles.meterLabel}>
        <span>{label}</span>
        <span>{percent >= 75 ? "High" : percent >= 45 ? "Balanced" : "Light"}</span>
      </div>
      <div className={styles.meterTrack} aria-label={label + " " + percent + "%"}>
        <span style={{ width: percent + "%" }} />
      </div>
    </div>
  );
}

export function CreativeDNA({ blueprint }: { blueprint: SeriesBlueprint }) {
  return (
    <section className={styles.panel} aria-labelledby="creative-dna-heading">
      <div className={styles.sectionEyebrow}>Creative DNA</div>
      <h2 id="creative-dna-heading">How this show should feel</h2>
      <div className={styles.dnaGrid}>
        <article>
          <span>Visual</span>
          <strong>{blueprint.creativeDNA.visualStyle.description}</strong>
          <p>{blueprint.creativeDNA.visualStyle.colorLanguage}</p>
        </article>
        <article>
          <span>Tone</span>
          <strong>{blueprint.creativeDNA.tone.primary}</strong>
          <p>{blueprint.creativeDNA.tone.secondary.join(" · ")}</p>
          <Meter label="Emotional intensity" value={blueprint.creativeDNA.tone.emotionalIntensity} />
          <Meter label="Darkness" value={blueprint.creativeDNA.tone.darkness} />
        </article>
        <article>
          <span>Pacing</span>
          <strong>{blueprint.creativeDNA.pacing.overall}</strong>
          <p>{blueprint.creativeDNA.pacing.dialogueDensity} dialogue · {blueprint.creativeDNA.pacing.actionFrequency} action</p>
        </article>
        <article>
          <span>Sound</span>
          <strong>{blueprint.creativeDNA.sound.musicDirection}</strong>
          <p>{blueprint.creativeDNA.sound.recurringMotifs.join(" · ")}</p>
        </article>
      </div>
    </section>
  );
}
