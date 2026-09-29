import type { CastMember } from "@/lib/series/types";
import styles from "./SeriesStudio.module.css";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function CastStrip({
  cast,
  onSelect
}: {
  cast: CastMember[];
  onSelect: (member: CastMember) => void;
}) {
  return (
    <section className={styles.sectionBlock} aria-labelledby="cast-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Cast</span>
          <h2 id="cast-heading">The people carrying the story</h2>
        </div>
      </div>
      <div className={styles.castScroller}>
        {cast.map((member) => (
          <button
            className={styles.castCard}
            data-role={member.role}
            key={member.id}
            type="button"
            onClick={() => onSelect(member)}
            aria-label={"Open " + member.name}
          >
            <div className={styles.castPortrait} aria-hidden="true">{initials(member.name)}</div>
            <span className={styles.roleLabel}>{member.role.replaceAll("_", " ")}</span>
            <strong>{member.name}</strong>
            <p>{member.summary}</p>
            <div className={styles.traitRow}>
              {member.personalityTraits.slice(0, 3).map((trait) => (
                <span key={trait}>{trait}</span>
              ))}
            </div>
            <small>{member.relationshipToProtagonist}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
