import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type LabourWeeksScreenProps = {
  projectId: number;
};

/** A site's labour weeks. Placeholder until Phase 2 builds it. */
export function LabourWeeksScreen(props: LabourWeeksScreenProps) {
  return <PlaceholderScreen title="Labour" phase="2" />;
}
