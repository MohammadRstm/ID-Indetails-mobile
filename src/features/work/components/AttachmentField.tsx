import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Button, IconButton, InlineError, Text, type AvatarPhoto } from "@/ui";

type AttachmentFieldProps = {
  /** The attached photo, ready to show. */
  photo: AvatarPhoto | null;
  uploading: boolean;
  error: string | null;
  onCamera: () => void;
  onLibrary: () => void;
  onRemove: () => void;
  disabled?: boolean;
};

/** One photo on a work entry: take one or pick one, then see it with a way to remove it. */
export function AttachmentField({
  photo,
  uploading,
  error,
  onCamera,
  onLibrary,
  onRemove,
  disabled,
}: AttachmentFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="label" tone="secondary">
        Photo
        <Text variant="small" tone="muted">
          {" · optional"}
        </Text>
      </Text>
      {uploading ? (
        <View style={[styles.preview, styles.center, { backgroundColor: colors.surface3 }]}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Uploading the photo" />
        </View>
      ) : photo ? (
        <View style={styles.row}>
          <Image
            source={{ uri: photo.uri, headers: photo.headers }}
            cachePolicy="disk"
            style={[styles.preview, { backgroundColor: colors.surface3 }]}
            accessibilityLabel="The attached photo"
          />
          <IconButton
            icon="trash"
            tone="danger"
            onPress={onRemove}
            accessibilityLabel="Remove the photo"
          />
        </View>
      ) : (
        <View style={styles.row}>
          <Button label="Take a photo" icon="plus" onPress={onCamera} disabled={disabled} />
          <Button
            label="Choose"
            icon="folder"
            variant="quiet"
            onPress={onLibrary}
            disabled={disabled}
          />
        </View>
      )}
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.s },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.m },
  preview: { width: 96, height: 96, borderRadius: radii.r2 },
  center: { alignItems: "center", justifyContent: "center" },
});
