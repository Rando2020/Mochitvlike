import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import styles from "../SeriesStudio.module.css";

export function LocationMapPanel({
  blueprint,
  onOpen
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  return (
    <article className={styles.featurePanel}>
      <span className={styles.featureStatus}>World map</span>
      <h3>{blueprint.world.locations.length ? blueprint.world.locations.length + " important places" : "Location Map"}</h3>
      <p>{blueprint.world.locations.length ? blueprint.world.locations.map((location) => location.name).join(" · ") : "Your first important location will emerge while developing Episode 1."}</p>
      <button className={styles.compactButton} type="button" onClick={() => onOpen?.("LOCATION_MAP")}>
        Open Locations
      </button>
    </article>
  );
}
