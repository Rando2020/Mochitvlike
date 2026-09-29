import type { SeriesBlueprint } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

export type ClarificationChoice = "YES" | "NO" | "HELP";

export function ClarificationCard({
  blueprint,
  onAnswer
}: {
  blueprint: SeriesBlueprint;
  onAnswer?: (questionId: string, choice: ClarificationChoice) => void;
}) {
  if (!blueprint.clarification.needed || blueprint.clarification.questions.length === 0) return null;
  const question = blueprint.clarification.questions[0];

  return (
    <section className={styles.clarificationCard} aria-labelledby="clarification-heading">
      <div>
        <span className={styles.sectionEyebrow}>One choice could change your show</span>
        <h2 id="clarification-heading">{question.question}</h2>
        <p>{question.whyItMatters}</p>
      </div>
      <div className={styles.choiceRow}>
        <button type="button" onClick={() => onAnswer?.(question.id, "YES")}>Yes, eventually</button>
        <button type="button" onClick={() => onAnswer?.(question.id, "NO")}>No</button>
        <button type="button" onClick={() => onAnswer?.(question.id, "HELP")}>Help me decide</button>
      </div>
    </section>
  );
}
