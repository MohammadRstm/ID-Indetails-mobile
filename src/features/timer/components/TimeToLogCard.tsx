import { StyleSheet, View } from "react-native";
import { fmtDayDate, fmtDur, fmtRange } from "@/format/time";
import { spacing } from "@/theme/tokens";
import { Button, Card, Text } from "@/ui";
import type { StoppedRun } from "../model";

type TimeToLogCardProps = {
  run: StoppedRun;
  minutes: number;
  onLog: () => void;
  onDiscard: () => void;
};

/** A stopped timer run that hasn't been logged yet (no connection when it stopped, or the sheet was closed). */
export function TimeToLogCard({ run, minutes, onLog, onDiscard }: TimeToLogCardProps) {
  return (
    <Card accent>
      <Text variant="micro">Time to log</Text>
      <Text variant="bodyStrong">{run.projectTitle}</Text>
      <Text variant="small" tone="secondary">
        {fmtDayDate(run.startedAt)} ·{" "}
        <Text variant="mono">{fmtRange(run.startedAt, run.stoppedAt)}</Text> · {fmtDur(minutes)}
      </Text>
      {run.description ? (
        <Text variant="small" tone="muted">
          {run.description}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label="Log it" icon="check" variant="primary" onPress={onLog} />
        <Button label="Discard" variant="quiet" onPress={onDiscard} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.m },
});
