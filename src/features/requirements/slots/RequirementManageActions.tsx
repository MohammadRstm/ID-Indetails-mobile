import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { Requirement } from "@/api/types";
import { useProject } from "@/features/projects/slots/projectAdminApi";
import {
  requirementsLocked,
  useDeleteRequirement,
  useTickRequirement,
} from "@/features/requirements/manage/api";
import { RequirementActionsSheet } from "@/features/requirements/manage/components/RequirementActionsSheet";
import { editRequirementHref } from "@/features/requirements/manage/editHref";
import { canOpen } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";
import { ConfirmDialog, IconButton, toast } from "@/ui";

export type RequirementManageActionsProps = { projectId: number; requirement: Requirement };

/**
 * A requirement row's menu for requirement:manage: tick or untick it for anyone, edit it, delete it. Hidden while
 * the project is completed or archived, when the API would refuse every change.
 */
export function RequirementManageActions({ projectId, requirement }: RequirementManageActionsProps) {
  const allowed = canOpen(usePermissions(), "editRequirement");
  const project = useProject(projectId, allowed);
  const tick = useTickRequirement(projectId);
  const remove = useDeleteRequirement(projectId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!allowed || !project.data || requirementsLocked(project.data.status)) return null;

  const onTick = () => {
    setMenuOpen(false);
    const done = !requirement.isDone;
    tick.mutate(
      { id: requirement.id, done },
      {
        onSuccess: () =>
          toast({ text: done ? "Requirement done" : "Requirement reopened", icon: "checkCircle" }),
        onError: (error) =>
          toast({ text: "That didn't save", sub: toApiError(error).message, icon: "alert" }),
      },
    );
  };

  const onDelete = () =>
    remove.mutate(requirement.id, {
      onSuccess: () => {
        setDeleting(false);
        toast({ text: "Requirement deleted", icon: "trash" });
      },
      onError: (error) => {
        setDeleting(false);
        toast({ text: "That didn't delete", sub: toApiError(error).message, icon: "alert" });
      },
    });

  return (
    <>
      <IconButton
        icon="dots"
        accessibilityLabel="Requirement actions"
        disabled={tick.isPending}
        onPress={() => setMenuOpen(true)}
      />
      <RequirementActionsSheet
        visible={menuOpen}
        text={requirement.text}
        isDone={requirement.isDone}
        onClose={() => setMenuOpen(false)}
        onTick={onTick}
        onEdit={() => {
          setMenuOpen(false);
          router.push(editRequirementHref(projectId, requirement.id));
        }}
        onDelete={() => {
          setMenuOpen(false);
          setDeleting(true);
        }}
      />
      <ConfirmDialog
        visible={deleting}
        title="Delete this requirement?"
        message={requirement.text}
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
