import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type ProjectActivityScreenProps = {
  projectId: number;
};

/** A project's activity. Placeholder until Phase 3 builds it. */
export function ProjectActivityScreen(props: ProjectActivityScreenProps) {
  return <PlaceholderScreen title="Activity" phase="3" />;
}
