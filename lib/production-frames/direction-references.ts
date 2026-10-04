import type { SeriesBlueprint } from "@/lib/series/types";
import { currentReferenceBinding } from "@/lib/character-direction/reference-binding";
import type { ProductionReferenceAsset } from "./types";
import { assertProductionReference, requireCharacterReferences } from "./references";

export function requireRevisionBoundCharacterReferences(series: SeriesBlueprint, references: readonly ProductionReferenceAsset[], characterIds: readonly string[], modelId: string) {
  const notes: string[] = [];
  const selected = characterIds.map(characterId => {
    const member = series.cast.find(c => c.id === characterId);
    if (!member) throw new Error("PRODUCTION_FRAME_CHARACTER_NOT_FOUND");
    const needsBinding = member.generationDirectionHistory?.some(entry => entry.visualChanged) || !!member.referenceBindingHistory?.length;
    if (!needsBinding) return requireCharacterReferences(references, [characterId], modelId)[0];
    const binding = currentReferenceBinding(member);
    if (!binding) throw new Error("CHARACTER_DIRECTION_REFERENCE_REVIEW_REQUIRED");
    const reference = references.find(r => r.id === binding.referenceId);
    if (!reference || reference.type !== "CHARACTER" || reference.characterId !== characterId ||
        reference.checksum !== binding.referenceChecksum || reference.version !== binding.referenceVersion ||
        reference.referenceRole !== binding.sourceRole || reference.status !== "APPROVED" || !reference.provenance) {
      throw new Error("CHARACTER_DIRECTION_REFERENCE_BINDING_INVALID");
    }
    const approvedReference = assertProductionReference(reference, modelId);
    notes.push(`Character ${characterId} visual revision ${binding.visualRevision}; approved identity binding ${binding.id}; reference ${reference.id} version ${binding.referenceVersion}; source role ${binding.sourceRole}.`);
    // An approved full-body/turnaround asset becomes primary for this specific
    // spec only after explicit creator identity attestation. Source rows stay as-is.
    return { ...approvedReference, referenceRole: "PRIMARY_IDENTITY" as const };
  });
  return { references: selected.map(({ version: _version, ...reference }) => reference), notes };
}
