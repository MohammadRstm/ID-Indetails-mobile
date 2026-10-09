import { router } from "expo-router";
import { useProject } from "@/features/projects/slots/projectAdminApi";
import { requirementsLocked } from "@/features/requirements/manage/api";
import { editRequirementHref } from "@/features/requirements/manage/editHref";
import { canOpen } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";
import { Button } from "@/ui";

export type AddRequirementButtonProps = { projectId: number };

/**
 * "Add" in the project requirements header, for requirement:manage. Hidden while the project is completed or
 * archived, when the API would refuse it.
 */
export function AddRequirementButton({ projectId }: AddRequirementButtonProps) {
  const allowed = canOpen(usePermissions(), "editRequirement");
  const project = useProject(projectId, allowed);
  if (!allowed || !project.data || requirementsLocked(project.data.status)) return null;
  return (
    <Button
      label="Add"
      icon="plus"
      accessibilityLabel="Add a requirement"
      onPress={() => router.push(editRequirementHref(projectId))}
    />
  );
}
