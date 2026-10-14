import { Image } from "expo-image";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { FilledNote } from "@/features/proton/components/FilledNote";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { Chip, Icon, IconButton, InlineError, Text } from "@/ui";

export type PickedFile = { id: number; uri: string; video: boolean };

type ComposerProps = {
  text: string;
  onTextChange: (text: string) => void;
  /** People matching the "@name" being typed, in a team chat. */
  mentionCandidates: { id: number; name: string }[];
  onMention: (person: { id: number; name: string }) => void;
  files: PickedFile[];
  uploading: number;
  onRemoveFile: (id: number) => void;
  onCamera: () => void;
  onLibrary: () => void;
  canAddFiles: boolean;
  warning: string | null;
  error: string | null;
  canSend: boolean;
  onSend: () => void;
  /** The text was written by Proton and not yet sent. */
  fromProton?: boolean;
};

/** Writing a message: text with @mentions in team chats, up to 10 photos or videos, and Send. */
export function Composer(props: ComposerProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
      {props.fromProton ? <FilledNote fields={["message"]} then="send" /> : null}
      {props.mentionCandidates.length > 0 ? (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.chips}
        >
          {props.mentionCandidates.map((person) => (
            <Chip
              key={person.id}
              label={`@${person.name}`}
              onPress={() => props.onMention(person)}
            />
          ))}
        </ScrollView>
      ) : null}
      {props.files.length > 0 || props.uploading > 0 ? (
        <ScrollView horizontal contentContainerStyle={styles.chips}>
          {props.files.map((file) => (
            <View key={file.id}>
              {file.video ? (
                <View style={[styles.thumb, styles.center, { backgroundColor: colors.surface3 }]}>
                  <Icon name="play" color={colors.ink2} />
                </View>
              ) : (
                <Image source={{ uri: file.uri }} style={styles.thumb} contentFit="cover" />
              )}
              <View style={styles.remove}>
                <IconButton
                  icon="x"
                  accessibilityLabel="Remove"
                  onPress={() => props.onRemoveFile(file.id)}
                />
              </View>
            </View>
          ))}
          {props.uploading > 0 ? (
            <View style={[styles.thumb, styles.center, { backgroundColor: colors.surface3 }]}>
              <ActivityIndicator color={colors.accent} accessibilityLabel="Uploading" />
            </View>
          ) : null}
        </ScrollView>
      ) : null}
      {props.warning ? (
        <Text variant="small" tone="warn">
          {props.warning}
        </Text>
      ) : null}
      {props.error ? <InlineError message={props.error} /> : null}
      <View style={styles.row}>
        <IconButton
          icon="plus"
          accessibilityLabel="Take a photo or video"
          onPress={props.onCamera}
          disabled={!props.canAddFiles}
        />
        <IconButton
          icon="attach"
          accessibilityLabel="Add photos or videos"
          onPress={props.onLibrary}
          disabled={!props.canAddFiles}
        />
        <TextInput
          value={props.text}
          onChangeText={props.onTextChange}
          placeholder="Message"
          placeholderTextColor={colors.ink3}
          selectionColor={colors.accent}
          multiline
          maxLength={4000}
          accessibilityLabel="Message"
          style={[
            typography.body,
            styles.input,
            { color: colors.ink, backgroundColor: colors.surface2, borderColor: colors.line2 },
          ]}
        />
        <IconButton
          icon="send"
          tone="accent"
          accessibilityLabel="Send"
          onPress={props.onSend}
          disabled={!props.canSend}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    gap: spacing.s,
  },
  chips: { gap: spacing.s, paddingHorizontal: spacing.s },
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xxs },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderRadius: radii.r3,
    paddingHorizontal: spacing.row + 2,
    paddingTop: spacing.row,
    paddingBottom: spacing.row,
  },
  thumb: { width: 64, height: 64, borderRadius: radii.r2 },
  center: { alignItems: "center", justifyContent: "center" },
  remove: { position: "absolute", top: -12, right: -12 },
});
