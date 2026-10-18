import { DIRECTION_CATALOG, type DirectionGroup } from "./catalog";
import { CharacterDirectionSchema, type CharacterDirection } from "./schema";
export function directionLabels(direction: CharacterDirection, group: DirectionGroup) {
  const selected = direction[group];
  const ids = Array.isArray(selected) ? selected : selected ? [selected] : [];
  return DIRECTION_CATALOG[group].filter(item => new Set<string>(ids).has(item.id)).map(item => item.label);
}
export function compileCharacterDirection(raw: CharacterDirection) {
  const direction = CharacterDirectionSchema.parse(raw);
  const guidance = (group: DirectionGroup) => {
    const selected = direction[group];
    const ids = Array.isArray(selected) ? selected : selected ? [selected] : [];
    return DIRECTION_CATALOG[group].filter(item => new Set<string>(ids).has(item.id)).map(item => item.guidance);
  };
  return {
    personality: guidance("personality"),
    visual: [...guidance("body"), ...guidance("clothing")],
    voice: [...guidance("voiceTexture"), ...guidance("voiceDelivery"), ...guidance("voicePace")]
  };
}
export function hasCharacterDirection(direction: CharacterDirection) {
  return direction.personality.length > 0 || Object.entries(direction).some(([key, value]) => key !== "personality" && value !== null);
}
