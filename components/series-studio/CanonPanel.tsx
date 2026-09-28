import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

export function CanonPanel({ blueprint }: { blueprint: SeriesBlueprint }) {
  return (
    <section className={styles.panel} aria-labelledby="canon-heading">
      <div className={styles.sectionEyebrow}>Canon</div>
      <h2 id="canon-heading">What the show already knows</h2>
      <div className={styles.canonGrid}>
        {blueprint.canon.facts.length ? (
          <div>
            <span className={styles.miniLabel}>Established</span>
            <ul className={styles.cleanList}>
              {blueprint.canon.facts.map((fact) => <li key={fact.id}>{fact.fact}</li>)}
            </ul>
          </div>
        ) : null}
        {blueprint.canon.mysteries.length ? (
          <div>
            <span className={styles.miniLabel}>Open mysteries</span>
            <ul className={styles.cleanList}>
              {blueprint.canon.mysteries.map((mystery) => (
                <li key={mystery.id}>
                  <strong>{mystery.question}</strong>
                  <span>{mystery.revealIntent}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
