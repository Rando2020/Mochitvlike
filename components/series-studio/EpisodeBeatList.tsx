import type { SceneSummary } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { selectCastByIds, selectLocation } from "./selectors";
import styles from "./SeriesStudio.module.css";

const BEAT_LABELS: Record<SeriesBlueprint["episodeOne"]["beats"][number]["type"], string> = {
  HOOK: "Hook",
  SETUP: "Setup",
  DISCOVERY: "Discovery",
  CONFLICT: "Conflict",
  ESCALATION: "Escalation",
  REVEAL: "Reveal",
  EMOTIONAL: "Emotional beat",
  ACTION: "Action",
  CLIFFHANGER: "Cliffhanger"
};

export function EpisodeBeatList({
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
  const sceneByBeat = new Map(sceneSummaries.map((scene) => [scene.sourceBeatId, scene]));

  return (
    <ol className={styles.beatList}>
      {blueprint.episodeOne.beats.map((beat, index) => {
        const cast = selectCastByIds(blueprint, beat.involvedCharacterIds);
        const location = selectLocation(blueprint, beat.locationId);
        const expanded = expandedBeatId === beat.id;
        const scene = sceneByBeat.get(beat.id);

        return (
          <li className={styles.beatItem} key={beat.id}>
            <button
              className={styles.beatSummaryButton}
              type="button"
              aria-expanded={expanded}
              onClick={() => onToggleBeat(beat.id)}
            >
              <span className={scene ? styles.beatStatusComplete : styles.beatStatus}>
                {scene ? "•" : String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.beatSummaryCopy}>
                <span className={styles.beatType}>
                  {BEAT_LABELS[beat.type]}{scene ? " · planned" : ""}
                </span>
                <strong>{beat.summary}</strong>
              </span>
              <span aria-hidden="true" className={styles.chevron}>
                {expanded ? "−" : "+"}
              </span>
            </button>

            {expanded ? (
              <div className={styles.beatDetails}>
                <div className={styles.beatMeta}>
                  <span>{cast.map((member) => member.name).join(" · ")}</span>
                  {location ? <span>{location.name}</span> : null}
                </div>
                <div className={styles.storyChange}>
                  <span>What changes</span>
                  <p>{beat.storyChange}</p>
                </div>
                <button
                  className={styles.compactButton}
                  type="button"
                  disabled={pending}
                  onClick={() => void onDevelopScene?.(beat.id)}
                >
                  {scene ? "Continue Scene" : "Develop Scene"}
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
