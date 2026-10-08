import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type ProjectMaterialsScreenProps = {
  projectId: number;
};

/** A site's materials. Placeholder until Phase 2 builds it. */
export function ProjectMaterialsScreen(props: ProjectMaterialsScreenProps) {
  return <PlaceholderScreen title="Materials" phase="2" />;
}
