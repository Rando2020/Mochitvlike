import type { SceneSummary } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import { selectActiveScenes, selectStudioNextStep } from "./studioGuide";
import styles from "./SeriesStudio.module.css";

export function StudioGuide({ blueprint, scenes, pending, preview, onScene, onReview }: {
  blueprint: SeriesBlueprint;
  scenes: SceneSummary[];
  pending: boolean;
  preview: boolean;
  onScene: (beatId: string) => void | Promise<void>;
  onReview: () => void;
}) {
  const next = selectStudioNextStep(blueprint, scenes);
  const planned = selectActiveScenes(blueprint, scenes).length;
  const review = next.kind === "REVIEW";
  return (
    <section className={styles.guideCard} aria-labelledby="studio-guide-heading" aria-busy={pending}>
      <div className={styles.sectionEyebrow}>{preview ? "Studio preview" : "Your next step"}</div>
      <p className={styles.guideProgress}>{planned} of {blueprint.episodeOne.beats.length} scenes planned</p>
      <h2 id="studio-guide-heading">{review ? "Review your episode's story" :
        next.kind === "CONTINUE" ? `Shape scene ${next.number}` : `Develop scene ${next.number}`}</h2>
      <p>{review ? "Every story beat has a ready scene plan. Review how the scenes flow before continuing production. This does not mean the episode has been rendered." :
        next.kind === "CONTINUE" ? "You have a saved draft for this story beat. Open it to review the action, dialogue intent, and emotional turn, then continue into script writing." :
        "Turn this story beat into a scene plan using your show's cast, world, and established story. You can review the result before continuing into script writing."}</p>
      {!review ? <div className={styles.guideChange}><span>What this scene needs to change</span><p>{next.beat.storyChange}</p></div> : null}
      {preview ? <p>This preview shows the workflow. Open a saved series to develop scenes.</p> : null}
      <div className={styles.guideActions}>
        <button type="button" className={styles.primaryButton} disabled={pending}
          onClick={() => review || preview ? onReview() : void onScene(next.beat.id)}>
          {pending ? "Developing scene…" : preview ? "Explore episode" : review ? "Review episode" :
            next.kind === "CONTINUE" ? `Open scene ${next.number}` : `Create scene ${next.number} plan`}
        </button>
        {!review && !preview ? <button type="button" className={styles.secondaryButton} onClick={onReview}>Choose another scene</button> : null}
      </div>
      <p className={styles.guideNote} role="status">{pending ? "Stay on this page while your scene plan is saved." : "Scene planning progress only. Visuals, motion, and audio are separate production steps."}</p>
    </section>
  );
}
