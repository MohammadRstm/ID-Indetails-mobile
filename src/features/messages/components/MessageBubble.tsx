import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import type { Message } from "@/api/types";
import { fmtDayDate, fmtDur, fmtTime } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Avatar, Icon, Text, type AvatarPhoto } from "@/ui";
import { mentionParts } from "../model";

/** A message on its way: shown at once, confirmed by the answer, or marked for a retry. */
export type Outgoing = {
  tempId: string;
  body: string;
  mentionIds: number[];
  attachmentIds: number[];
  /** Local addresses of the picked photos, to show while sending. */
  previews: string[];
  status: "sending" | "failed";
};

type Common = {
  mine: boolean;
  imageSource: (fileId: number) => AvatarPhoto;
};

function Attachments({
  files,
  previews,
  imageSource,
}: {
  files: Message["attachments"];
  previews?: string[];
  imageSource: (fileId: number) => AvatarPhoto;
}) {
  const { colors } = useTheme();
  if (!files.length && !previews?.length) return null;
  return (
    <View style={styles.media}>
      {files.map((file) =>
        file.kind === "video" ? (
          <View
            key={file.id}
            style={[styles.tile, styles.video, { backgroundColor: colors.surface3 }]}
          >
            <Icon name="play" color={colors.ink2} />
            <Text variant="small" tone="muted">
              Video
            </Text>
          </View>
        ) : (
          <Image
            key={file.id}
            source={imageSource(file.id)}
            cachePolicy="disk"
            contentFit="cover"
            style={[styles.tile, { backgroundColor: colors.surface3 }]}
            accessibilityLabel="Photo"
          />
        ),
      )}
      {previews?.map((uri) => (
        <Image
          key={uri}
          source={{ uri }}
          contentFit="cover"
          style={[styles.tile, { opacity: 0.7 }]}
        />
      ))}
    </View>
  );
}

type MessageBubbleProps = Common & {
  message: Message;
  /** First of a run: shows the sender's face and name. */
  showSender: boolean;
  senderPhoto: AvatarPhoto | null;
  /** Names that can be mentioned in this chat. */
  mentionNames: string[];
};

/** One message: own messages on the right in the accent tint, others on the left with the sender's face. */
export function MessageBubble({
  message: m,
  mine,
  showSender,
  senderPhoto,
  mentionNames,
  imageSource,
}: MessageBubbleProps) {
  const { colors } = useTheme();
  const comment = m.kind === "task_comment" ? m.taskComment : null;
  return (
    <View style={[styles.wrap, mine ? styles.mine : styles.theirs, showSender && styles.runStart]}>
      {!mine ? (
        <View style={styles.face}>
          {showSender ? <Avatar name={m.sender.name} photo={senderPhoto} size={28} /> : null}
        </View>
      ) : null}
      <View style={[styles.column, mine && styles.columnMine]}>
        {showSender && !mine ? (
          <Text variant="small" tone="muted">
            {m.sender.name}
          </Text>
        ) : null}
        {comment ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.line,
                borderLeftColor: colors.accent,
              },
            ]}
          >
            <Text variant="micro">Comment on {comment.author.name.split(" ")[0]}'s work</Text>
            <Text variant="bodyStrong">{comment.projectTitle}</Text>
            <Text variant="small" tone="secondary" numberOfLines={2}>
              {comment.description}
            </Text>
            <Text variant="small" tone="muted">
              {fmtDayDate(comment.startedAt)}
              {comment.minutes != null ? ` · ${fmtDur(comment.minutes)}` : ""}
            </Text>
            {m.body ? <Text>{m.body}</Text> : null}
          </View>
        ) : (
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: colors.accentSoft }
                : { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1 },
            ]}
          >
            {m.body ? (
              <Text tone={mine ? "accent" : "default"}>
                {mentionParts(m.body, mentionNames).map((part, i) => (
                  <Text
                    key={i}
                    variant={part.mention ? "bodyStrong" : "body"}
                    tone={part.mention ? "accent" : undefined}
                  >
                    {part.text}
                  </Text>
                ))}
              </Text>
            ) : null}
            <Attachments files={m.attachments} imageSource={imageSource} />
          </View>
        )}
        <Text variant="small" tone="muted" style={styles.time}>
          {fmtTime(m.createdAt)}
        </Text>
      </View>
    </View>
  );
}

type OutgoingBubbleProps = Common & { outgoing: Outgoing; onRetry: () => void };

/** A message being sent: "Sending…", or "Not sent · Tap to retry". */
export function OutgoingBubble({ outgoing, imageSource, onRetry }: OutgoingBubbleProps) {
  const { colors } = useTheme();
  const failed = outgoing.status === "failed";
  return (
    <View style={[styles.wrap, styles.mine, styles.runStart]}>
      <Pressable
        disabled={!failed}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={failed ? "Not sent. Tap to retry" : "Sending"}
        style={[styles.column, styles.columnMine]}
      >
        <View
          style={[
            styles.bubble,
            { backgroundColor: colors.accentSoft, opacity: failed ? 1 : 0.75 },
          ]}
        >
          {outgoing.body ? <Text tone="accent">{outgoing.body}</Text> : null}
          <Attachments files={[]} previews={outgoing.previews} imageSource={imageSource} />
        </View>
        <Text variant="small" tone={failed ? "danger" : "muted"} style={styles.time}>
          {failed ? "Not sent · Tap to retry" : "Sending…"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    marginTop: spacing.xxs,
  },
  runStart: { marginTop: spacing.m },
  mine: { justifyContent: "flex-end" },
  theirs: { justifyContent: "flex-start" },
  face: { width: 28 },
  column: { maxWidth: "80%", gap: spacing.xxs },
  columnMine: { alignItems: "flex-end" },
  bubble: {
    paddingHorizontal: spacing.row + 2,
    paddingVertical: spacing.m,
    borderRadius: radii.r3,
    gap: spacing.s,
  },
  card: {
    padding: spacing.row,
    gap: spacing.xs,
    borderRadius: radii.r2,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  media: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  tile: { width: 120, height: 120, borderRadius: radii.r2 },
  video: { alignItems: "center", justifyContent: "center", gap: spacing.xs },
  time: { fontSize: 11.5, lineHeight: 15 },
});
