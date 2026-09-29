import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import styles from "../SeriesStudio.module.css";

export function PowerSystemPanel({
  blueprint
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  const power = blueprint.world.powerSystem;
  if (!power.exists) return null;

  return (
    <article className={styles.featurePanel}>
      <span className={styles.featureStatus}>Power system</span>
      <h3>{power.name ?? "Power System"}</h3>
      <p>{power.summary}</p>
      <div className={styles.featureMiniGrid}>
        {power.costs[0] ? <div><span>Cost</span><strong>{power.costs[0]}</strong></div> : null}
        {power.limitations[0] ? <div><span>Limit</span><strong>{power.limitations[0]}</strong></div> : null}
      </div>
    </article>
  );
}
