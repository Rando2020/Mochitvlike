import { CreatorExperiencePreview } from "@/components/creator-preview/CreatorExperiencePreview";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";

export const metadata = {
  title: "Creator Experience Preview",
  description: "Preview the next chapter of the creator studio. Concept only."
};

export default function CreatorPreviewPage() {
  return <CreatorExperiencePreview blueprint={theWoundsWeKeep} />;
}
