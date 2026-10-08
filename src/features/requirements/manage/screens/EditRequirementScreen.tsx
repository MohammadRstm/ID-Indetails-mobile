import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type EditRequirementScreenProps = {
  projectId: number;
  /** Null when adding a new one. */
  requirementId: number | null;
};

/** Adding (no `id`) or editing (`?projectId&id`) a requirement. Placeholder until Phase 3 builds it. */
export function EditRequirementScreen(props: EditRequirementScreenProps) {
  return <PlaceholderScreen title="Requirement" phase="3" />;
}
