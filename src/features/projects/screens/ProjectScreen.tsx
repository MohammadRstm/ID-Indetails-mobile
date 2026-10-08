import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type ProjectScreenProps = {
  projectId: number;
  /** Opened on this section (a push or link about a meeting). */
  section: "meetings" | null;
};

/** A project, with its requirements and meetings sections. Placeholder until Phase 2 builds it. */
export function ProjectScreen(props: ProjectScreenProps) {
  return <PlaceholderScreen title="Project" phase="2" />;
}
