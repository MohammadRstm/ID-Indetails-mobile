import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import { Button, Icon, Text } from "@/ui";
import { BrandMark } from "./BrandMark";

type LockViewProps = {
  /** What unlocks it, for the button: "Face ID", "fingerprint", "your phone's passcode". */
  unlockName: string;
  onUnlock: () => void;
  onSignOut: () => void;
  unlocking: boolean;
  /** Unlocking didn't work a few times: signing out (and in again with the password) is offered. */
  offerSignOut: boolean;
  /** The phone has no screen lock any more, so only signing out is left. */
  unavailable: boolean;
};

/** The locked app: nothing of its content, a way to unlock, and a way out. */
export function LockView({
  unlockName,
  onUnlock,
  onSignOut,
  unlocking,
  offerSignOut,
  unavailable,
}: LockViewProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.ground }]}>
      <View style={styles.center}>
        <BrandMark logoUri={null} size={56} />
        <View style={styles.texts}>
          <View style={styles.title}>
            <Icon name="lock" size={18} color={colors.ink2} />
            <Text variant="heading" accessibilityRole="header">
              ID InDetails is locked
            </Text>
          </View>
          <Text tone="muted" align="center">
            {unavailable
              ? "This phone no longer has a screen lock, so it can't unlock the app. Sign out, then sign in again with your password."
              : `Unlock with ${unlockName} to carry on.`}
          </Text>
        </View>
        <View style={styles.actions}>
          {unavailable ? null : (
            <Button
              label="Unlock"
              icon="lock"
              variant="primary"
              size="large"
              fullWidth
              loading={unlocking}
              onPress={onUnlock}
            />
          )}
          {offerSignOut || unavailable ? (
            <Button label="Sign out" icon="logout" fullWidth onPress={onSignOut} />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  texts: { alignItems: "center", gap: spacing.s },
  title: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  actions: { alignSelf: "stretch", gap: spacing.row },
});
