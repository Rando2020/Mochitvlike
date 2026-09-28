import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import styles from "../SeriesStudio.module.css";

export function ClueLedgerPanel({
  onOpen
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  return (
    <article className={styles.featurePanel}>
      <span className={styles.featureStatus}>Mystery tool</span>
      <h3>Clue Ledger</h3>
      <p>The mystery structure is ready. Clues will appear as you develop episodes.</p>
      <button className={styles.compactButton} type="button" onClick={() => onOpen?.("CLUE_LEDGER")}>
        Open Clue Ledger
      </button>
    </article>
  );
}
