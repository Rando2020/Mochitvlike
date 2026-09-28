import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

export function StoryEnginePanel({ blueprint }: { blueprint: SeriesBlueprint }) {
  return (
    <section className={styles.panel} aria-labelledby="story-engine-heading">
      <div className={styles.sectionEyebrow}>Story engine</div>
      <h2 id="story-engine-heading">What keeps the story moving</h2>
      <p className={styles.lead}>{blueprint.storyEngine.centralConflict}</p>
      <div className={styles.storyColumns}>
        <div>
          <span className={styles.miniLabel}>Protagonist wants</span>
          <p>{blueprint.storyEngine.protagonistWant}</p>
        </div>
        <div>
          <span className={styles.miniLabel}>What they actually need</span>
          <p>{blueprint.storyEngine.protagonistNeed}</p>
        </div>
      </div>
      <div className={styles.listBlock}>
        <span className={styles.miniLabel}>Stakes</span>
        <ul>{blueprint.storyEngine.stakes.map((stake) => <li key={stake}>{stake}</li>)}</ul>
      </div>
      <div className={styles.listBlock}>
        <span className={styles.miniLabel}>Why You Keep Watching</span>
        <ul>{blueprint.storyEngine.promisesToAudience.map((promise) => <li key={promise}>{promise}</li>)}</ul>
      </div>
    </section>
  );
}
