import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import styles from "../SeriesStudio.module.css";

export function ReadyFeaturePanel({
  feature,
  label,
  description,
  onOpen
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  label?: string;
  description?: string;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  return (
    <article className={styles.featurePanel}>
      <span className={styles.featureStatus}>Ready to develop</span>
      <h3>{label ?? feature.type.replaceAll("_", " ")}</h3>
      <p>{description ?? feature.reason}</p>
      <button className={styles.compactButton} type="button" onClick={() => onOpen?.(feature.type)}>
        Open {label ?? "tool"}
      </button>
    </article>
  );
}
