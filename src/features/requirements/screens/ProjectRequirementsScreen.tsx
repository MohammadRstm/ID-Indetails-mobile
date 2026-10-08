import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type ProjectRequirementsScreenProps = {
  projectId: number;
  /** Scrolled to and highlighted (a push or link about one requirement). */
  highlightRequirementId: number | null;
};

/** A project's requirements. Placeholder until Phase 2 builds it. */
export function ProjectRequirementsScreen(props: ProjectRequirementsScreenProps) {
  return <PlaceholderScreen title="Requirements" phase="2" />;
}
