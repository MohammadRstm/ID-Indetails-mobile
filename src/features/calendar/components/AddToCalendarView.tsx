import { StyleSheet, View } from "react-native";
import { spacing } from "@/theme/tokens";
import { Button, Text } from "@/ui";

export type AddToCalendarState = "idle" | "adding" | "added" | "denied";

type AddToCalendarViewProps = {
  state: AddToCalendarState;
  onAdd: () => void;
  onOpenSettings: () => void;
};

/** "Add to calendar"; once added it says so; without calendar access it explains how to allow it. */
export function AddToCalendarView({ state, onAdd, onOpenSettings }: AddToCalendarViewProps) {
  if (state === "denied") {
    return (
      <View style={styles.denied}>
        <Text variant="small" tone="muted">
          ID InDetails can&apos;t add to your calendar: calendar access is turned off. You can allow
          it in the phone&apos;s settings.
        </Text>
        <Button label="Open settings" variant="quiet" icon="settings" onPress={onOpenSettings} />
      </View>
    );
  }
  return (
    <Button
      label={state === "added" ? "Added to calendar" : "Add to calendar"}
      icon={state === "added" ? "check" : "calendar"}
      onPress={onAdd}
      loading={state === "adding"}
      disabled={state === "added"}
    />
  );
}

const styles = StyleSheet.create({
  denied: { gap: spacing.xs },
});
