import { CharacterDirectionSummary } from "@/components/show-creation/CharacterDirectionControls";
import Link from "next/link";
import type { CastMember } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

export function CastDetailSheet({
  member,
  seriesId,
  onClose
}: {
  member: CastMember | null;
  seriesId?: string;
  onClose: () => void;
}) {
  if (!member) return null;

  return (
    <div className={styles.sheetBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.detailSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cast-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <button className={styles.sheetClose} type="button" onClick={onClose} aria-label="Close cast details">
          ×
        </button>
        <span className={styles.roleLabel}>{member.role.replaceAll("_", " ")}</span>
        <h2 id="cast-detail-title">{member.name}</h2>
        <p className={styles.sheetSummary}>{member.summary}</p>
        {seriesId && seriesId !== "demo" ? <Link href={`/series/${encodeURIComponent(seriesId)}/cast/${encodeURIComponent(member.id)}/direction`}>Edit generation direction</Link> : null}
        {member.generationDirection ? <section><h3>Generation direction</h3><CharacterDirectionSummary direction={member.generationDirection} /></section> : null}
        <dl className={styles.characterGoals}>
          <div>
            <dt>Wants</dt>
            <dd>{member.want}</dd>
          </div>
          <div>
            <dt>Needs</dt>
            <dd>{member.need}</dd>
          </div>
          <div>
            <dt>Inner conflict</dt>
            <dd>{member.internalConflict}</dd>
          </div>
          <div>
            <dt>Connection</dt>
            <dd>{member.relationshipToProtagonist}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
