import type { ProductionReferenceAsset, ProductionFrameGenerationSpec } from "../types";

/**
 * A spec retains immutable evidence of the selected reference, but queued work
 * must not reuse a reference after its creator revokes approval or replaces
 * its source bytes. The caller must supply a fresh owner/series-filtered list
 * of approved records, never the job's own serialized snapshot.
 */
export function productionFrameReferencesCurrent(
  spec: Pick<ProductionFrameGenerationSpec, "characters" | "references" | "model">,
  currentApproved: readonly ProductionReferenceAsset[]
): boolean {
  const current = new Map(currentApproved.map(reference => [reference.id, reference]));
  const snapshot = new Map(spec.references.map(reference => [reference.id, reference]));
  if (snapshot.size !== spec.references.length) return false;

  for (const reference of spec.references) {
    const active = current.get(reference.id);
    if (!active || active.status !== "APPROVED" ||
        active.benchmarkOnly || !active.approved || !active.creatorApproved ||
        !active.storagePath || !reference.storagePath ||
        active.storagePath !== reference.storagePath ||
        active.checksum !== reference.checksum ||
        active.type !== reference.type ||
        active.characterId !== reference.characterId ||
        active.abilityId !== reference.abilityId ||
        (active.modelCompatibility.length > 0 &&
         !active.modelCompatibility.includes(spec.model.modelId))) return false;
  }
  // Identity constraints must still point to a current, approved character
  // reference. A revision-attested FULL_BODY binding can be normalized to
  // PRIMARY_IDENTITY in the immutable spec without changing the source row.
  for (const character of spec.characters) {
    if (!character.referenceAssetIds.some(id => {
      const ref = snapshot.get(id);
      return ref?.type === "CHARACTER" && ref.characterId === character.characterId &&
        current.has(id);
    })) return false;
  }
  return true;
}
