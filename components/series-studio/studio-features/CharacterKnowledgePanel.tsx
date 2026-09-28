import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import styles from "../SeriesStudio.module.css";

export function CharacterKnowledgePanel({
  blueprint,
  onOpen
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  return (
    <article className={styles.featurePanel}>
      <span className={styles.featureStatus}>Knowledge tracker</span>
      <h3>Who knows what?</h3>
      <p>Track secrets and reveals across {blueprint.cast.length} cast members as episodes develop.</p>
      <button className={styles.compactButton} type="button" onClick={() => onOpen?.("CHARACTER_KNOWLEDGE")}>
        Open Knowledge
      </button>
    </article>
  );
}
