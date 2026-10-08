import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type AddMaterialsScreenProps = {
  projectId: number | null;
};

/** Adding materials; the site comes from `?projectId` when opened from a site. Placeholder until Phase 2 builds it. */
export function AddMaterialsScreen(props: AddMaterialsScreenProps) {
  return <PlaceholderScreen title="Add materials" phase="2" />;
}
