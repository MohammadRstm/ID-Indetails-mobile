import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { http } from "@/api/http";
import { toApiError } from "@/api/errors";
import type { Employee } from "@/api/types";
import { useCurrentUser } from "@/auth/session";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { Button, Card, ConfirmDialog, InlineError, Section, Text, toast } from "@/ui";

export type PersonSecurityActionsProps = { person: Employee };

type Action = "end" | "restore";

/** Signs the person out everywhere and blocks sign-in (end), or lets them sign in again (restore). */
function useSessionAction(personId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: Action) =>
      (await http.post<Employee>(`/employees/${personId}/sessions/${action}`)).data,
    onSuccess: () => {
      // The person's screens and the people list read the sign-in state from the employee record.
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}

const COPY: Record<Action, { title: string; message: string; confirm: string; done: string }> = {
  end: {
    title: "End all sessions?",
    message: "They are signed out on every device and can't sign in until you restore it.",
    confirm: "End sessions",
    done: "Sessions ended",
  },
  restore: {
    title: "Restore sign-in?",
    message: "They can sign in again. Sessions that were ended stay ended.",
    confirm: "Restore sign-in",
    done: "Sign-in restored",
  },
};

/** Slot: ending a person's sessions and restoring their sign-in (session:manage), on the person screen. */
export function PersonSecurityActions({ person }: PersonSecurityActionsProps) {
  const perms = usePermissions();
  const me = useCurrentUser();
  const [asking, setAsking] = useState<Action | null>(null);
  const mutation = useSessionAction(person.id);

  // Never one's own: the API refuses it too.
  if (!perms.has(P.SESSION_MANAGE) || person.id === me.id) return null;

  const blocked = person.sessionsRevokedAt != null;
  const action: Action = blocked ? "restore" : "end";
  const copy = COPY[action];

  function confirm() {
    mutation.mutate(action, {
      onError: () => setAsking(null),
      onSuccess: () => {
        setAsking(null);
        toast({ text: copy.done, icon: "checkCircle" });
      },
    });
  }

  return (
    <Section title="Security">
      <Card>
        <Text variant="small" tone="muted">
          {blocked
            ? "Their sessions were ended and sign-in is blocked."
            : "Sign them out everywhere if a phone is lost or an account is at risk."}
        </Text>
        <Button
          label={copy.confirm}
          variant={blocked ? "secondary" : "danger"}
          icon={blocked ? "checkCircle" : "x"}
          onPress={() => {
            mutation.reset();
            setAsking(action);
          }}
        />
      </Card>
      <ConfirmDialog
        visible={asking != null}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.confirm}
        destructive={!blocked}
        busy={mutation.isPending}
        onConfirm={confirm}
        onCancel={() => setAsking(null)}
      />
      {mutation.isError && (
        <InlineError what="the change" message={toApiError(mutation.error).message} />
      )}
    </Section>
  );
}
