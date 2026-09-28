import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

export function SeriesHeader({
  blueprint,
  onContinueEpisode,
  onOpenBible
}: {
  blueprint: SeriesBlueprint;
  onContinueEpisode: () => void;
  onOpenBible: () => void;
}) {
  return (
    <header className={styles.seriesHeader}>
      <div className={styles.headerCopy}>
        <div className={styles.genreRow} aria-label="Series genres">
          {blueprint.identity.genres.map((genre) => (
            <span className={styles.genreChip} key={genre}>
              {genre.replaceAll("_", " ")}
            </span>
          ))}
        </div>
        <h1>{blueprint.identity.title}</h1>
        <p>{blueprint.identity.logline}</p>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.primaryButton} type="button" onClick={onContinueEpisode}>
          Continue Episode
        </button>
        <button className={styles.secondaryButton} type="button" onClick={onOpenBible}>
          Series Bible
        </button>
      </div>
    </header>
  );
}
