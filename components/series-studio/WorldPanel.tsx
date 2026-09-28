import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

export function WorldPanel({ blueprint }: { blueprint: SeriesBlueprint }) {
  const world = blueprint.world;
  const hasDetails = world.rules.length > 0 || world.locations.length > 0 || world.factions.length > 0 || world.powerSystem.exists;

  return (
    <section className={styles.panel} aria-labelledby="world-heading">
      <div className={styles.sectionEyebrow}>World</div>
      <h2 id="world-heading">{world.name ?? "The world around your story"}</h2>
      <p className={styles.lead}>{world.summary}</p>

      {!hasDetails ? <p className={styles.contextualEmpty}>Your first important place and rules will emerge while developing Episode 1.</p> : null}

      {world.rules.length ? (
        <div className={styles.worldGroup}>
          <span className={styles.miniLabel}>Rules that matter</span>
          {world.rules.map((rule) => (
            <article className={styles.worldItem} key={rule.id}>
              <strong>{rule.rule}</strong>
              <p>{rule.consequences}</p>
            </article>
          ))}
        </div>
      ) : null}

      {world.locations.length ? (
        <div className={styles.worldGroup}>
          <span className={styles.miniLabel}>Places</span>
          <div className={styles.compactGrid}>
            {world.locations.map((location) => (
              <article className={styles.worldItem} key={location.id}>
                <strong>{location.name}</strong>
                <p>{location.narrativePurpose}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {world.factions.length ? (
        <div className={styles.worldGroup}>
          <span className={styles.miniLabel}>Forces in play</span>
          {world.factions.map((faction) => (
            <article className={styles.worldItem} key={faction.id}>
              <strong>{faction.name}</strong>
              <p>{faction.description}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
