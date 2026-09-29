import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import styles from "../SeriesStudio.module.css";

export function AbilityTrackerPanel({
  blueprint,
  onOpen
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  const power = blueprint.world.powerSystem;

  return (
    <article className={styles.featurePanel}>
      <span className={styles.featureStatus}>Ability tracker</span>
      <h3>{power.exists && power.name ? power.name + " consequences" : "Abilities"}</h3>
      <p>{power.exists ? "Track what each use changes, costs, or leaves behind." : "Abilities will become trackable when the story establishes them."}</p>
      <button className={styles.compactButton} type="button" onClick={() => onOpen?.("ABILITY_TRACKER")}>
        Open Abilities
      </button>
    </article>
  );
}
