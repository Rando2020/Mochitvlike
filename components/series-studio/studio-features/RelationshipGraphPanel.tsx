import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import styles from "../SeriesStudio.module.css";

export function RelationshipGraphPanel({
  blueprint,
  onOpen
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  const first = blueprint.relationships[0];

  return (
    <article className={styles.featurePanel}>
      <span className={styles.featureStatus}>Relationship graph</span>
      <h3>{blueprint.relationships.length} active connections</h3>
      <p>{first ? first.initialState + " " + first.tension : "Relationship arcs will grow as your cast develops."}</p>
      <button className={styles.compactButton} type="button" onClick={() => onOpen?.("RELATIONSHIP_GRAPH")}>
        Open Relationships
      </button>
    </article>
  );
}
