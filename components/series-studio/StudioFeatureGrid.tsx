import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import { StudioFeatureRenderer } from "./StudioFeatureRenderer";
import { getStudioFeatureDefinition } from "./studioFeatureRegistry";
import styles from "./SeriesStudio.module.css";

export function StudioFeatureGrid({
  title,
  features,
  blueprint,
  onOpen
}: {
  title?: string;
  features: StudioFeature[];
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  if (!features.length) return null;

  return (
    <section className={styles.sectionBlock} aria-label={title ?? "Series tools"}>
      {title ? (
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionEyebrow}>Specialized for this show</span>
            <h2>{title}</h2>
          </div>
        </div>
      ) : null}
      <div className={styles.featureGrid}>
        {features.map((feature) => {
          const definition = getStudioFeatureDefinition(feature.type);
          if (!definition) return null;

          return (
            <div key={feature.type} className={styles.featureCardShell} data-feature={feature.type}>
              <div className={styles.featureCardHeading}>
                <span className={styles.featureIcon} aria-hidden="true">{definition.icon}</span>
                <div>
                  <span>{definition.label}</span>
                  <small>{feature.reason}</small>
                </div>
              </div>
              <StudioFeatureRenderer feature={feature} blueprint={blueprint} onOpen={onOpen} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
