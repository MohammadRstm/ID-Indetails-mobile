import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import { useCurrentUser } from "@/auth/session";
import { AddToCalendarButton } from "@/features/calendar/AddToCalendarButton";
import { fmtDayDateY, fmtDur, fmtRange } from "@/format/time";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { spacing } from "@/theme/tokens";
import {
  Button,
  Card,
  ConfirmDialog,
  InlineError,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Sheet,
  Skeleton,
  Text,
  toast,
} from "@/ui";
import { useDeleteMeeting, useMeeting, useUpdateMeeting } from "../api";
import { MeetingForm } from "../components/MeetingForm";
import {
  canChangeMeeting,
  draftOfMeeting,
  meetingBody,
  meetingProblem,
  type MeetingDraft,
} from "../model";

export type MeetingScreenProps = {
  meetingId: number;
};

const back = () => (router.canGoBack() ? router.back() : router.replace("/meetings"));

/** One meeting: when, where and what about, with change and remove for whoever may. */
export function MeetingScreen({ meetingId }: MeetingScreenProps) {
  const me = useCurrentUser();
  const perms = usePermissions();
  const meeting = useMeeting(meetingId);
  const update = useUpdateMeeting();
  const remove = useDeleteMeeting();
  const [editing, setEditing] = useState<MeetingDraft | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (meeting.isError && !meeting.data) {
    const error = toApiError(meeting.error);
    return (
      <Screen header={<ScreenHeader title="Meeting" onBack={back} />}>
        <LoadError
          what="this meeting"
          message={
            error.status === 404 ? "It was removed, or you can't see its project." : error.message
          }
          traceId={error.traceId}
          onRetry={error.status === 404 ? undefined : () => void meeting.refetch()}
        />
      </Screen>
    );
  }
  if (!meeting.data) {
    return (
      <Screen header={<ScreenHeader title="Meeting" onBack={back} />}>
        <Skeleton lines={5} height={18} />
      </Screen>
    );
  }

  const m = meeting.data;
  const canChange = canChangeMeeting(m, me.id, {
    manage: perms.has(P.MEETING_MANAGE),
    create: perms.has(P.MEETING_CREATE),
  });

  async function save() {
    if (!editing) return;
    const issue = meetingProblem(editing);
    if (issue) {
      setProblem(issue);
      return;
    }
    try {
      await update.mutateAsync({ id: m.id, body: meetingBody(editing) });
      setEditing(null);
      toast({ text: "Meeting changed", icon: "calendar" });
      void meeting.refetch();
    } catch (error) {
      setProblem(toApiError(error).message);
    }
  }

  return (
    <Screen
      header={
        <ScreenHeader title={m.topic || "Meeting"} subtitle={m.project.title} onBack={back} />
      }
    >
      <Section>
        <Card>
          <Text variant="micro">{fmtDayDateY(m.startsAt)}</Text>
          <Text variant="figure">{fmtRange(m.startsAt, m.endsAt)}</Text>
          <Text variant="small" tone="muted">
            {fmtDur(m.minutes)}
            {m.createdBy ? ` · set by ${m.createdBy.name}` : ""}
          </Text>
          {m.description ? <Text>{m.description}</Text> : null}
          <AddToCalendarButton
            event={{
              title: m.topic ? `${m.topic} · ${m.project.title}` : `Meeting · ${m.project.title}`,
              startsAt: m.startsAt,
              endsAt: m.endsAt,
              notes: m.description ?? undefined,
            }}
          />
        </Card>
      </Section>
      <Section>
        <Card padded={false}>
          <ListRow
            title={m.project.title}
            subtitle="Open the project"
            chevron
            onPress={() =>
              router.push({ pathname: "/projects/[id]", params: { id: String(m.project.id) } })
            }
          />
        </Card>
      </Section>
      {canChange ? (
        <View style={styles.actions}>
          <Button
            label="Change"
            icon="edit"
            onPress={() => {
              setProblem(null);
              setEditing(draftOfMeeting(m));
            }}
          />
          <Button
            label="Remove"
            icon="trash"
            variant="danger"
            onPress={() => setConfirming(true)}
          />
        </View>
      ) : null}
      {problem && !editing ? <InlineError message={problem} /> : null}
      <Sheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title="Change the meeting"
        footer={
          <Button
            label="Save"
            variant="primary"
            loading={update.isPending}
            onPress={() => void save()}
          />
        }
      >
        {editing ? (
          <MeetingForm
            draft={editing}
            onChange={(next) => {
              setEditing(next);
              setProblem(null);
            }}
            projectOptions={null}
          />
        ) : null}
        {problem && editing ? <InlineError message={problem} /> : null}
      </Sheet>
      <ConfirmDialog
        visible={confirming}
        title="Remove this meeting?"
        message={`${fmtDayDateY(m.startsAt)}, ${fmtRange(m.startsAt, m.endsAt)}.`}
        confirmLabel="Remove"
        destructive
        busy={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(m.id);
            setConfirming(false);
            toast({ text: "Meeting removed", icon: "trash" });
            back();
          } catch (error) {
            setConfirming(false);
            setProblem(toApiError(error).message);
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.m },
});
