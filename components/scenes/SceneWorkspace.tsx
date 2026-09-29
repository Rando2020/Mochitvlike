import type { SceneBlueprint } from "@/lib/scenes/types";
import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./SceneWorkspace.module.css";

function Section({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function SceneWorkspace({
  scene,
  series
}: {
  scene: SceneBlueprint;
  series: SeriesBlueprint;
}) {
  const sourceBeat = series.episodeOne.beats.find((beat) => beat.id === scene.sourceBeatId);
  const castById = new Map(series.cast.map((member) => [member.id, member]));

  return (
    <main className={styles.root}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Scene plan</span>
          <h1>{scene.identity.title}</h1>
          <p>{scene.identity.shortDescription}</p>
        </div>
        <button type="button" className={styles.primaryButton} disabled>
          Write Scene
        </button>
      </header>

      <section className={styles.sourceBeat}>
        <span>Source beat</span>
        <strong>{sourceBeat?.summary ?? scene.storyPurpose.objective}</strong>
        <p>{scene.storyPurpose.requiredStoryChange}</p>
      </section>

      <div className={styles.grid}>
        <Section eyebrow="Purpose" title="Why this scene exists">
          <p>{scene.storyPurpose.whyThisSceneExists}</p>
          <div className={styles.callout}>
            <span>Must change</span>
            <strong>{scene.storyPurpose.requiredStoryChange}</strong>
          </div>
        </Section>

        <Section eyebrow="Opening state" title="Where everyone starts">
          <p>{scene.openingState.summary}</p>
          <div className={styles.cards}>
            {scene.openingState.emotionalStateByCharacter.map((entry) => (
              <article key={entry.characterId}>
                <strong>{castById.get(entry.characterId)?.name ?? entry.characterId}</strong>
                <p>{entry.state}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section eyebrow="Cast" title="Who wants what">
          <div className={styles.cards}>
            {scene.cast.map((entry) => (
              <article key={entry.characterId}>
                <strong>{castById.get(entry.characterId)?.name ?? entry.characterId}</strong>
                <span>{entry.sceneRole}</span>
                <p>{entry.immediateWant}</p>
                <small>Pressure: {entry.pressure}</small>
              </article>
            ))}
          </div>
        </Section>

        <Section eyebrow="Dramatic structure" title="How the scene turns">
          <ol className={styles.structure}>
            <li><span>Entry</span><p>{scene.dramaticStructure.entryBeat}</p></li>
            <li><span>Escalation</span><p>{scene.dramaticStructure.escalation}</p></li>
            <li><span>Turn</span><p>{scene.dramaticStructure.turn}</p></li>
            <li><span>Exit</span><p>{scene.dramaticStructure.exitBeat}</p></li>
          </ol>
        </Section>

        <Section eyebrow="Dialogue intent" title="What the conversation is doing">
          <div className={styles.cards}>
            {scene.dialogueIntent.map((entry) => (
              <article key={entry.characterId}>
                <strong>{castById.get(entry.characterId)?.name ?? entry.characterId}</strong>
                <p>{entry.objective}</p>
                <small>Subtext: {entry.subtext}</small>
              </article>
            ))}
          </div>
        </Section>

        <Section eyebrow="Action intent" title="What must happen physically">
          <p>{scene.actionIntent.summary}</p>
          <ul>
            {scene.actionIntent.requiredActions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </Section>

        <Section eyebrow="Emotional turn" title={scene.emotionalTurn.from + " → " + scene.emotionalTurn.to}>
          <p>{scene.emotionalTurn.trigger}</p>
        </Section>

        <Section eyebrow="Ending state" title="What is different when we leave">
          <p>{scene.endingState.summary}</p>
          <ul>
            {scene.endingState.characterChanges.map((entry) => (
              <li key={entry.characterId}>
                <strong>{castById.get(entry.characterId)?.name ?? entry.characterId}: </strong>
                {entry.change}
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="Canon proposals" title="Changes to review later">
          {scene.proposedCanonChanges.length ? (
            <ul>
              {scene.proposedCanonChanges.map((change, index) => (
                <li key={change.type + "-" + index}>
                  <strong>{change.type.replaceAll("_", " ")}: </strong>
                  {change.explanation}
                </li>
              ))}
            </ul>
          ) : (
            <p>This scene does not need to propose a canon change.</p>
          )}
          <small className={styles.safetyNote}>These are proposals only. Canon has not been changed.</small>
        </Section>

        <Section eyebrow="Continuity" title="What this scene cannot break">
          <ul>
            {scene.continuityChecks.forbiddenContradictions.map((item) => <li key={item}>{item}</li>)}
            {scene.continuityChecks.unresolvedQuestionsProtected.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Section>
      </div>
    </main>
  );
}
