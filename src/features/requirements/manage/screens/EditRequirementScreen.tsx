import { router, type Href } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { Project, Requirement } from "@/api/types";
import { personName, useEmployees } from "@/features/people/api";
import { PeoplePickerSheet } from "@/features/people/components/PeoplePickerSheet";
import { useProject } from "@/features/projects/slots/projectAdminApi";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  ConfirmDialog,
  EmptyState,
  LoadError,
  Screen,
  ScreenHeader,
  Skeleton,
  toast,
} from "@/ui";
import {
  requirementsLocked,
  useDeleteRequirement,
  useRequirementList,
  useSaveRequirement,
} from "../api";
import { RequirementForm, type RequirementFormErrors } from "../components/RequirementForm";

export type EditRequirementScreenProps = {
  projectId: number;
  /** Null when adding a new one. */
  requirementId: number | null;
};

function leave(projectId: number) {
  if (router.canGoBack()) router.back();
  else
    router.replace({
      pathname: "/projects/[id]/requirements",
      params: { id: String(projectId) },
    } as Href);
}

/**
 * Adding (no `id`) or editing (`?projectId&id`) a requirement, for requirement:manage: its text, deadline and
 * assignees. The API checks the rules again (assignees are the domain's employees; a closed project refuses).
 */
export function EditRequirementScreen({ projectId, requirementId }: EditRequirementScreenProps) {
  const isNew = requirementId == null;
  const project = useProject(projectId);
  const list = useRequirementList(projectId, !isNew);
  const requirement = isNew ? null : list.data?.items.find((r) => r.id === requirementId);
  const failed = project.error ?? (isNew ? null : list.error);

  let body;
  if (failed) {
    const error = toApiError(failed);
    body = (
      <LoadError
        what={error.status === 404 ? "this project" : "the requirement"}
        message={error.message}
        traceId={error.traceId}
        onRetry={() => {
          void project.refetch();
          if (!isNew) void list.refetch();
        }}
      />
    );
  } else if (!project.data || (!isNew && !list.data)) {
    body = <Skeleton lines={5} height={20} />;
  } else if (requirementsLocked(project.data.status)) {
    body = (
      <EmptyState
        art="done"
        title={`This project is ${project.data.status}`}
        text="Its requirements are kept as they were closed. Reopen the project to change them."
      />
    );
  } else if (!isNew && !requirement) {
    body = (
      <EmptyState
        title="This requirement isn't there any more"
        text="It may have been deleted. Go back to the project's requirements."
      />
    );
  } else {
    body = (
      <RequirementEditor
        key={requirement?.id ?? "new"}
        project={project.data}
        requirement={requirement ?? null}
      />
    );
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title={isNew ? "New requirement" : "Edit requirement"}
          subtitle={project.data?.title}
          onBack={() => leave(projectId)}
        />
      }
    >
      {body}
    </Screen>
  );
}

type RequirementEditorProps = { project: Project; requirement: Requirement | null };

function RequirementEditor({ project, requirement }: RequirementEditorProps) {
  const perms = usePermissions();
  const canAssign = perms.has(P.EMPLOYEE_VIEW);
  const save = useSaveRequirement(project.id, requirement?.id ?? null);
  const remove = useDeleteRequirement(project.id);
  const [text, setText] = useState(requirement?.text ?? "");
  const [deadline, setDeadline] = useState<string | null>(requirement?.deadline ?? null);
  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    requirement?.assignees.map((a) => a.id) ?? [],
  );
  const [errors, setErrors] = useState<RequirementFormErrors>({});
  const [picking, setPicking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Who may be assigned: the domain's employees (not admins), active or invited.
  const employees = useEmployees({ domain: project.domain, role: "employee" }, canAssign);
  const assignable = (employees.data ?? [])
    .filter((p) => p.status !== "deactivated")
    .map((p) => ({ id: p.id, name: personName(p), detail: p.team?.name ?? p.position }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Someone already assigned keeps their name even when they no longer show in the list.
  const known = new Map([
    ...(requirement?.assignees ?? []).map((a) => [a.id, a.name] as const),
    ...assignable.map((a) => [a.id, a.name] as const),
  ]);
  const assignees = assigneeIds.map((id) => ({ id, name: known.get(id) ?? "Someone" }));

  const onSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setErrors({ text: "Write what has to be achieved." });
      return;
    }
    setErrors({});
    save.mutate(
      { text: trimmed, deadline, assigneeIds },
      {
        onSuccess: () => {
          if (requirement) {
            toast({ text: "Requirement updated", icon: "checkCircle" });
          } else {
            toast({
              text: `Requirement added${assigneeIds.length ? ` · ${assigneeIds.length} notified` : ""}`,
              icon: "checkCircle",
            });
          }
          leave(project.id);
        },
        onError: (error) => {
          const e = toApiError(error);
          const field = (name: string) => e.fieldErrors[name]?.[0];
          const next: RequirementFormErrors = {
            text: field("text"),
            deadline: field("deadline"),
            assignees: field("assigneeIds") ?? (e.code === "assignee_not_allowed" ? e.message : undefined),
          };
          if (!next.text && !next.deadline && !next.assignees) next.form = e.message;
          setErrors(next);
        },
      },
    );
  };

  const onDelete = () =>
    requirement &&
    remove.mutate(requirement.id, {
      onSuccess: () => {
        setDeleting(false);
        toast({ text: "Requirement deleted", icon: "trash" });
        leave(project.id);
      },
      onError: (error) => {
        setDeleting(false);
        setErrors({ form: toApiError(error).message });
      },
    });

  return (
    <>
      <RequirementForm
        isNew={!requirement}
        execution={project.domain === "execution"}
        text={text}
        deadline={deadline}
        assignees={assignees}
        errors={errors}
        saving={save.isPending}
        canAssign={canAssign}
        onChangeText={setText}
        onChangeDeadline={setDeadline}
        onPickAssignees={() => setPicking(true)}
        onSave={onSave}
        onDelete={requirement ? () => setDeleting(true) : undefined}
      />
      <PeoplePickerSheet
        visible={picking}
        title="Assigned to"
        people={assignable}
        selected={assigneeIds}
        loading={employees.isPending}
        multiple
        emptyText="This project's domain has no employees to assign."
        onToggle={(id) =>
          setAssigneeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
        }
        onClose={() => setPicking(false)}
      />
      <ConfirmDialog
        visible={deleting}
        title="Delete this requirement?"
        message={requirement?.text}
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
