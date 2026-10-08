import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { Button } from "./Button";
import { Text } from "./Text";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button, for deleting or discarding. */
  destructive?: boolean;
  /** The confirmed action is running: the confirm button spins and nothing can be pressed twice. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Asks before an action that can't be undone. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={busy ? undefined : onCancel}
          accessible={false}
        />
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              boxShadow: colors.shadow3,
            },
          ]}
        >
          <Text variant="heading">{title}</Text>
          {message ? <Text tone="secondary">{message}</Text> : null}
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="quiet" onPress={onCancel} disabled={busy} />
            <Button
              label={confirmLabel}
              variant={destructive ? "danger" : "primary"}
              onPress={onConfirm}
              loading={busy}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl },
  dialog: {
    width: "100%",
    maxWidth: 420,
    padding: spacing.xl,
    gap: spacing.m,
    borderRadius: radii.r3,
    borderWidth: 1,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.m,
    marginTop: spacing.m,
  },
});
