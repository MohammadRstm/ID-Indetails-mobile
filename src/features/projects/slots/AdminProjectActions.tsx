import { router, type Href } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { Project, ProjectStatus } from "@/api/types";
import { personName, useEmployees } from "@/features/people/api";
import { PeoplePickerSheet } from "@/features/people/components/PeoplePickerSheet";
import { protonHrefFor } from "@/features/proton/pageContext";
import { P } from "@/permissions/codes";
import { canOpen } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";
import { ConfirmDialog, IconButton, toast } from "@/ui";
import { ProjectActionsSheet } from "./ProjectActionsSheet";
import {
  STATUS_ACTIONS,
  useChangeProjectOwner,
  useChangeProjectStatus,
  type StatusAction,
} from "./projectAdminApi";

export type AdminProjectActionsProps = { project: Project };

const STATUS_AFTER: Record<StatusAction, ProjectStatus> = {
  hold: "hold",
  resume: "active",
  complete: "completed",
  archive: "archived",
  reopen: "active",
};

const STATUS_WORD: Record<ProjectStatus, string> = {
  active: "active",
  hold: "on hold",
  completed: "completed",
  archived: "archived",
};

/** What each change asks before it happens, in the web's words (CompleteProjectModal for completing). */
export function confirmationOf(action: StatusAction, project: Project) {
  switch (action) {
    case "hold":
      return {
        title: `Put ${project.title} on hold?`,
        message:
          "It stays editable, and its requirements can still change. Resume it when work starts again.",
        confirm: "Put on hold",
      };
    case "resume":
      return {
        title: `Resume ${project.title}?`,
        message: "It becomes active again.",
        confirm: "Resume",
      };
    case "complete":
      return {
        title: `Close ${project.title}?`,
        message:
          "Every open requirement is marked done, so progress becomes 100%. The agreed amount is locked and it " +
          "leaves every employee's active list. " +
          (project.domain === "execution"
            ? "No new materials or labour can be added. "
            : "No new work can be logged. ") +
          "Reopening the project undoes this.",
        confirm: "Complete project",
      };
    case "archive":
      return {
        title: `Archive ${project.title}?`,
        message: "It leaves the active lists; its history is kept. Reopen it to work on it again.",
        confirm: "Archive",
      };
    case "reopen":
      return {
        title: `Reopen ${project.title}?`,
        message:
          "It becomes active again. Requirements ticked when it was closed reopen, and the agreed amount is unlocked.",
        confirm: "Reopen",
      };
  }
}

/** Words for the API's codes where the phone can say more than its message. */
function statusErrorText(error: unknown): string {
  const e = toApiError(error);
  if (e.code === "materials_not_sent") {
    return "Some materials haven't been sent to the client. Send a client statement first, then complete the project.";
  }
  if (e.code === "invalid_status_change" || e.code === "status_unchanged") {
    return "Someone may have changed it meanwhile. Pull down to refresh, then try again.";
  }
  return e.message;
}

/**
 * The admin's actions in the project screen's header: set its status (project:change_status), change its owner
 * (project:edit), open its activity and ask Proton about it. Each status change is confirmed first; the API checks
 * every rule again.
 */
export function AdminProjectActions({ project }: AdminProjectActionsProps) {
  const perms = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<StatusAction | null>(null);
  const [choosingOwner, setChoosingOwner] = useState(false);
  const change = useChangeProjectStatus(project.id);
  const changeOwner = useChangeProjectOwner(project);

  const statusActions = perms.has(P.PROJECT_CHANGE_STATUS) ? STATUS_ACTIONS[project.status] : [];
  const canChangeOwner = perms.has(P.PROJECT_EDIT) && perms.has(P.EMPLOYEE_VIEW);
  const canSeeActivity = canOpen(perms, "projectActivity");
  const canAsk = canOpen(perms, "proton");

  // Owners are the active admins of the project's domain, and super admins, whom only super admins can list.
  const admins = useEmployees(
    { domain: project.domain, role: "admin", status: "active" },
    choosingOwner,
  );
  const superAdmins = useEmployees(
    { role: "super_admin", status: "active" },
    choosingOwner && perms.isSuperAdmin,
  );
  const owners = [...(superAdmins.data ?? []), ...(admins.data ?? [])].map((p) => ({
    id: p.id,
    name: personName(p),
    detail: p.position,
  }));

  if (statusActions.length === 0 && !canChangeOwner && !canSeeActivity && !canAsk) return null;

  const go = (href: Href) => {
    setMenuOpen(false);
    router.push(href);
  };

  const runStatus = (action: StatusAction) =>
    change.mutate(action, {
      onSuccess: () => {
        setConfirming(null);
        if (action === "complete") {
          toast({
            text: `${project.title} closed`,
            sub: "Removed from employee lists · history kept",
            icon: "checkCircle",
            actionLabel: "Undo",
            action: () => change.mutate("reopen"),
          });
        } else {
          toast({
            text: `${project.title} is now ${STATUS_WORD[STATUS_AFTER[action]]}`,
            icon: "checkCircle",
          });
        }
      },
      onError: (error) => {
        setConfirming(null);
        toast({ text: "The status didn't change", sub: statusErrorText(error), icon: "alert" });
      },
    });

  const pickOwner = (ownerId: number) => {
    if (ownerId === project.owner.id) {
      setChoosingOwner(false);
      return;
    }
    changeOwner.mutate(ownerId, {
      onSuccess: (saved) => {
        setChoosingOwner(false);
        toast({ text: `${saved.owner.name} now owns ${saved.title}`, icon: "checkCircle" });
      },
      onError: (error) =>
        toast({ text: "The owner didn't change", sub: toApiError(error).message, icon: "alert" }),
    });
  };

  const confirmation = confirming ? confirmationOf(confirming, project) : null;

  return (
    <>
      <IconButton
        icon="dots"
        accessibilityLabel="Project actions"
        onPress={() => setMenuOpen(true)}
      />
      <ProjectActionsSheet
        visible={menuOpen}
        title={project.title}
        statusActions={statusActions}
        ownerName={project.owner.name}
        onClose={() => setMenuOpen(false)}
        onStatus={(action) => {
          setMenuOpen(false);
          setConfirming(action);
        }}
        onChangeOwner={
          canChangeOwner
            ? () => {
                setMenuOpen(false);
                setChoosingOwner(true);
              }
            : undefined
        }
        onActivity={
          canSeeActivity
            ? () =>
                go({
                  pathname: "/projects/[id]/activity",
                  params: { id: String(project.id) },
                } as Href)
            : undefined
        }
        onAskProton={
          canAsk ? () => go(protonHrefFor("project", project.id, project.domain)) : undefined
        }
      />
      <ConfirmDialog
        visible={confirmation != null}
        title={confirmation?.title ?? ""}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirm ?? ""}
        busy={change.isPending}
        onConfirm={() => confirming && runStatus(confirming)}
        onCancel={() => setConfirming(null)}
      />
      <PeoplePickerSheet
        visible={choosingOwner}
        title="Project owner"
        people={owners}
        selected={[project.owner.id]}
        loading={admins.isPending}
        busy={changeOwner.isPending}
        emptyText="No admin can own this project."
        onToggle={pickOwner}
        onClose={() => setChoosingOwner(false)}
      />
    </>
  );
}
