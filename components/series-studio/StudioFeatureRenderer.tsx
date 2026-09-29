import type { SeriesBlueprint, StudioFeature } from "@/lib/series/types";
import { getStudioFeatureDefinition } from "./studioFeatureRegistry";

export function StudioFeatureRenderer({
  feature,
  blueprint,
  onOpen
}: {
  feature: StudioFeature;
  blueprint: SeriesBlueprint;
  onOpen?: (type: StudioFeature["type"]) => void;
}) {
  const definition = getStudioFeatureDefinition(feature.type);

  if (!definition) {
    return null;
  }

  const Component = definition.component;

  return (
    <Component
      feature={feature}
      blueprint={blueprint}
      onOpen={onOpen}
    />
  );
}
