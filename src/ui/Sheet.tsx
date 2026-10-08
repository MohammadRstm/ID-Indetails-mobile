import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { radii, spacing } from "@/theme/tokens";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** The sheet's actions, pinned under the content. */
  footer?: ReactNode;
};

/** A bottom sheet over a scrim: the phone's version of the web's modal. */
export function Sheet({ visible, onClose, title, subtitle, children, footer }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={[styles.fill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              boxShadow: colors.shadow3,
              paddingBottom: Math.max(insets.bottom, spacing.l),
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.line2 }]} />
          {(title || subtitle) && (
            <View style={[styles.head, { borderBottomColor: colors.line }]}>
              <View style={styles.headText}>
                {title ? (
                  <Text variant="heading" accessibilityRole="header">
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text variant="small" tone="muted">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <IconButton icon="x" onPress={onClose} accessibilityLabel="Close" />
            </View>
          )}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { borderTopColor: colors.line }]}>{footer}</View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "90%",
    borderTopLeftRadius: radii.r3,
    borderTopRightRadius: radii.r3,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    marginTop: spacing.m,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.m,
    paddingLeft: spacing.xl,
    paddingRight: spacing.s,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  headText: { flex: 1, gap: spacing.xxs },
  body: { flexGrow: 0 },
  bodyContent: { padding: spacing.xl, gap: spacing.l },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.m,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.l,
    borderTopWidth: 1,
  },
});
