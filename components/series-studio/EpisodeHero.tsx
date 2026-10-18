import type { SceneSummary } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { episodeProgress } from "./selectors";
import { EpisodeBeatList } from "./EpisodeBeatList";
import styles from "./SeriesStudio.module.css";

export function EpisodeHero({
  blueprint,
  sceneSummaries,
  pending = false,
  expandedBeatId,
  onToggleBeat,
  onDevelopScene
}: {
  blueprint: SeriesBlueprint;
  sceneSummaries: SceneSummary[];
  pending?: boolean;
  expandedBeatId: string | null;
  onToggleBeat: (beatId: string) => void;
  onDevelopScene?: (beatId: string) => void | Promise<void>;
}) {
  const progress = episodeProgress(blueprint.episodeOne.beats.length, sceneSummaries.length);

  return (
    <section className={styles.episodeHero} aria-labelledby="episode-one-heading">
      <div className={styles.sectionEyebrow}>Episode 1</div>
      <div className={styles.episodeHeadingRow}>
        <div>
          <h2 id="episode-one-heading">{blueprint.episodeOne.title}</h2>
          <p>{blueprint.episodeOne.purpose}</p>
        </div>
        <div className={styles.progressBadge} aria-label={progress + "% planned"}>
          {progress}%
        </div>
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: progress + "%" }} />
      </div>
      <div className={styles.hookCard}>
        <span>Opening hook</span>
        <p>{blueprint.episodeOne.hook}</p>
      </div>
      <EpisodeBeatList
        blueprint={blueprint}
        sceneSummaries={sceneSummaries}
        pending={pending}
        expandedBeatId={expandedBeatId}
        onToggleBeat={onToggleBeat}
        onDevelopScene={onDevelopScene}
      />
    </section>
  );
}
