import type { SceneSummary } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { selectActiveScenes } from "./studioGuide";
import { selectCastByIds, selectLocation } from "./selectors";
import styles from "./EpisodeBoard.module.css";

export function EpisodeBoard({ blueprint, scenes, pending, preview, onScene }: {
  blueprint: SeriesBlueprint;
  scenes: SceneSummary[];
  pending: boolean;
  preview: boolean;
  onScene: (beatId: string) => void | Promise<void>;
}) {
  const active = selectActiveScenes(blueprint, scenes);
  const byBeat = new Map(active.map(scene => [scene.sourceBeatId, scene]));
  const ready = active.filter(scene => scene.status === "READY").length;
  return (
    <section className={styles.board} aria-labelledby="episode-board-title" aria-busy={pending}>
      <header className={styles.heading}>
        <div><span className={styles.eyebrow}>Episode 1 · Story plan</span>
          <h2 id="episode-board-title" tabIndex={-1}>{blueprint.episodeOne.title}</h2>
          <p>{blueprint.episodeOne.purpose}</p></div>
        <p className={styles.count}>{active.length} / {blueprint.episodeOne.beats.length} scene plans saved<br />{ready} ready plans</p>
      </header>
      <p className={styles.note}>Plan each story change, then continue in its scene workspace. Saved plans do not indicate rendered footage.</p>
      {preview ? <p className={styles.note}>Example board. Scene creation is available in a saved show.</p> : null}
      <ol className={styles.cards}>
        {blueprint.episodeOne.beats.map((beat, index) => {
          const scene = byBeat.get(beat.id);
          const cast = selectCastByIds(blueprint, beat.involvedCharacterIds);
          const location = selectLocation(blueprint, beat.locationId);
          return <li className={styles.card} key={beat.id}>
            <div className={styles.cardTop}><span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.eyebrow}>{beat.type.replaceAll("_", " ")}</span>
              <span className={styles.badge} data-state={scene?.status ?? "MISSING"}>{scene ? scene.status === "READY" ? "Ready plan" : "Draft plan" : "Not planned"}</span></div>
            <h3>{scene?.title ?? beat.summary}</h3>
            {scene ? <p className={styles.summary}>{beat.summary}</p> : null}
            <dl className={styles.context}>
              <div><dt>What changes</dt><dd>{beat.storyChange}</dd></div>
              <div><dt>Cast</dt><dd>{cast.map(member => member.name).join(" · ") || "No cast assigned"}</dd></div>
              <div><dt>Location</dt><dd>{location?.name ?? "Location not set"}</dd></div>
            </dl>
            {preview ? <span className={styles.note}>Preview only</span> : <button type="button" aria-label={`${scene ? "Open scene plan" : "Develop scene plan"} ${index + 1}`} disabled={pending} onClick={() => void onScene(beat.id)}>
              {scene ? "Open scene plan" : "Develop scene plan"}
            </button>}
          </li>;
        })}
      </ol>
    </section>
  );
}
