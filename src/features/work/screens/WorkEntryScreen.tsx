import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import { fmtDayDateY, fmtDur, fmtRange, relTime } from "@/format/time";
import { radii, spacing } from "@/theme/tokens";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  InlineError,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
  toast,
} from "@/ui";
import { useDeleteEntry, useRestoreEntry, useWorkEntry } from "../api";
import { EntryRow } from "../components/EntryRow";
import { requestLogWork } from "../logWorkRequest";
import { workErrorText } from "../model";
import { thumbSource } from "../photos";

export type WorkEntryScreenProps = {
  entryId: number;
};

const back = () => (router.canGoBack() ? router.back() : router.replace("/work"));

/** One work entry: what, when, how long, its photo and comments, with edit and delete while allowed. */
export function WorkEntryScreen({ entryId }: WorkEntryScreenProps) {
  const detail = useWorkEntry(entryId);
  const remove = useDeleteEntry();
  const restore = useRestoreEntry();
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (detail.isError && !detail.data) {
    const error = toApiError(detail.error);
    return (
      <Screen header={<ScreenHeader title="Entry" onBack={back} />}>
        <LoadError
          what="this entry"
          message={error.status === 404 ? "It was removed, or isn't yours to see." : error.message}
          traceId={error.traceId}
          onRetry={error.status === 404 ? undefined : () => void detail.refetch()}
        />
      </Screen>
    );
  }
  if (!detail.data) {
    return (
      <Screen header={<ScreenHeader title="Entry" onBack={back} />}>
        <Skeleton lines={6} height={18} />
      </Screen>
    );
  }

  const { entry, comments, sameDay } = detail.data;
  const others = sameDay.filter((e) => e.id !== entry.id);

  async function deleteEntry() {
    setActionError(null);
    try {
      await remove.mutateAsync(entry.id);
      setConfirming(false);
      toast({
        text: "Entry deleted",
        sub: `${entry.project.title} · ${fmtDur(entry.minutes)}`,
        icon: "trash",
        actionLabel: "Undo",
        action: () => restore.mutate(entry.id),
      });
      back();
    } catch (error) {
      setConfirming(false);
      setActionError(workErrorText(toApiError(error)));
    }
  }

  return (
    <Screen
      header={<ScreenHeader title={entry.project.title} subtitle="Work entry" onBack={back} />}
      refreshing={detail.isRefetching}
      onRefresh={() => void detail.refetch()}
    >
      <Section>
        <Card>
          <Text variant="micro">{fmtDayDateY(entry.startedAt)}</Text>
          <Text variant="figure">{fmtDur(entry.minutes)}</Text>
          <Text variant="mono" tone="secondary">
            {fmtRange(entry.startedAt, entry.endedAt)}
          </Text>
          {entry.overtimeMinutes > 0 ? (
            <Badge label={`${fmtDur(entry.overtimeMinutes)} overtime`} tone="warn" />
          ) : null}
          {entry.description ? <Text>{entry.description}</Text> : null}
          {entry.attachment ? (
            <Image
              source={thumbSource(entry.attachment.id)}
              cachePolicy="disk"
              contentFit="cover"
              style={styles.photo}
              accessibilityLabel="The entry's photo"
            />
          ) : null}
        </Card>
      </Section>
      {actionError ? <InlineError message={actionError} /> : null}
      {entry.canEdit ? (
        <Section>
          <View style={styles.actions}>
            <Button
              label="Edit"
              icon="edit"
              onPress={() => {
                requestLogWork({ edit: entry });
                router.push("/log-work");
              }}
            />
            <Button
              label="Delete"
              icon="trash"
              variant="danger"
              onPress={() => setConfirming(true)}
            />
          </View>
        </Section>
      ) : (
        <Text variant="small" tone="muted" style={styles.locked}>
          This entry can’t be changed any more.
        </Text>
      )}
      <Section title={comments.length ? `Comments · ${comments.length}` : "Comments"}>
        {comments.length === 0 ? (
          <Text variant="small" tone="muted">
            No comments.
          </Text>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <View style={styles.author}>
                <Avatar name={comment.author.name} size={28} />
                <View style={styles.authorText}>
                  <Text variant="bodyStrong">{comment.author.name}</Text>
                  <Text variant="small" tone="muted">
                    {relTime(comment.createdAt)}
                  </Text>
                </View>
              </View>
              <Text>{comment.body}</Text>
            </Card>
          ))
        )}
      </Section>
      {others.length > 0 ? (
        <Section title="Same day on this project">
          <Card padded={false}>
            {others.map((other, i) => (
              <EntryRow
                key={other.id}
                entry={other}
                divider={i < others.length - 1}
                onPress={() =>
                  router.push({ pathname: "/work/entry/[id]", params: { id: String(other.id) } })
                }
              />
            ))}
          </Card>
        </Section>
      ) : null}
      <ConfirmDialog
        visible={confirming}
        title="Delete this entry?"
        message={`${fmtDur(entry.minutes)} on ${entry.project.title}. You can undo it straight after.`}
        confirmLabel="Delete"
        destructive
        busy={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void deleteEntry()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: radii.r2 },
  actions: { flexDirection: "row", gap: spacing.m },
  locked: { marginBottom: spacing.l },
  author: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  authorText: { flex: 1 },
});
