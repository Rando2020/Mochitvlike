"use client";
import { DIRECTION_CATALOG, type DirectionGroup } from "@/lib/character-direction/catalog";
import type { CharacterDirection } from "@/lib/character-direction/schema";
import { directionLabels } from "@/lib/character-direction/compile";
import styles from "./CharacterDirection.module.css";
export const DIRECTION_GROUP_LABELS: Record<DirectionGroup, string> = {
  personality: "Personality", body: "Body build", clothing: "Clothing", voiceTexture: "Voice texture", voiceDelivery: "Voice delivery", voicePace: "Speaking pace"
};
export function CharacterDirectionControls({ value, onChange, disabled, existing = false }: {
  value: CharacterDirection; onChange: (value: CharacterDirection) => void; disabled: boolean; existing?: boolean;
}) {
  const traitLimit = value.personality.length >= 3;
  return <details className={styles.controls} open={existing || undefined}>
    <summary>{existing ? "Character direction" : "Main character direction · optional"}</summary>
    <p>{existing ? "Guide future generations for this cast member. Story defaults retain the original character description." : "Guide your protagonist's personality, appearance, and voice. Leave a choice open to let the story suggest it."}</p>
    <fieldset disabled={disabled}><legend>Personality · choose up to 3</legend>
      <div className={styles.traits}>{DIRECTION_CATALOG.personality.map(item => <label key={item.id}>
        <input type="checkbox" checked={value.personality.includes(item.id)} disabled={disabled || (traitLimit && !value.personality.includes(item.id))}
          onChange={event => onChange({ ...value, personality: event.target.checked ? [...value.personality, item.id] : value.personality.filter(id => id !== item.id) })} />
        <span>{item.label}</span>
      </label>)}</div>
      <p className={styles.hint}>Traits guide behavior; they do not replace your character's goals or conflicts.</p>
    </fieldset>
    <div className={styles.grid}>{(Object.keys(DIRECTION_GROUP_LABELS) as DirectionGroup[]).filter(group => group !== "personality").map(group => <label key={group}>
      {DIRECTION_GROUP_LABELS[group]}<select disabled={disabled} value={value[group] as string ?? ""}
        onChange={event => onChange({ ...value, [group]: event.target.value || null })}>
        <option value="">Let the story suggest</option>{DIRECTION_CATALOG[group].map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>)}</div>
    <p className={styles.hint}>Voice choices guide future speech delivery. They do not clone a voice or guarantee a provider's exact timbre. Body and clothing choices do not determine personality or voice.</p>
  </details>;
}
export function CharacterDirectionSummary({ direction }: { direction: CharacterDirection }) {
  return <dl className={styles.summary} aria-label="Character generation direction">{(Object.keys(DIRECTION_GROUP_LABELS) as DirectionGroup[]).map(group => {
    const labels = directionLabels(direction, group);
    return labels.length ? <div key={group}><dt>{DIRECTION_GROUP_LABELS[group]}</dt><dd>{labels.join(" · ")}</dd></div> : null;
  })}</dl>;
}
