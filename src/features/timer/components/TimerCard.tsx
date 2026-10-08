import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { fmtTime } from "@/format/time";
import { spacing } from "@/theme/tokens";
import { Badge, Button, Card, Select, Text, TextField, type SelectOption } from "@/ui";
import { elapsedMs, fmtElapsed, type RunningTimer } from "../model";

/** Re-renders every second while shown, for the ticking time. */
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function RunningTime({ startedAt }: { startedAt: string }) {
  const now = useNow();
  return (
    <Text variant="hero" accessibilityRole="timer">
      {fmtElapsed(elapsedMs(startedAt, now))}
    </Text>
  );
}

type TimerCardProps = {
  running: RunningTimer | null;
  projectOptions: SelectOption<number>[];
  projectId: number | null;
  onProjectChange: (id: number) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  onStart: () => void;
  onStop: () => void;
};

/** The work timer: pick a project and start; while it runs, the time ticks and Stop logs it. */
export function TimerCard({
  running,
  projectOptions,
  projectId,
  onProjectChange,
  description,
  onDescriptionChange,
  onStart,
  onStop,
}: TimerCardProps) {
  if (running) {
    return (
      <Card accent>
        <View style={styles.head}>
          <Badge label="Running" tone="live" icon="timer" />
          <Text variant="small" tone="muted">
            since {fmtTime(running.startedAt)}
          </Text>
        </View>
        <RunningTime startedAt={running.startedAt} />
        <Text variant="bodyStrong">{running.projectTitle}</Text>
        {running.description ? (
          <Text variant="small" tone="secondary">
            {running.description}
          </Text>
        ) : null}
        <Button
          label="Stop and log"
          icon="stop"
          variant="primary"
          size="large"
          fullWidth
          onPress={onStop}
        />
      </Card>
    );
  }
  return (
    <Card>
      <Text variant="subheading">Timer</Text>
      <Select
        label="Project"
        value={projectId}
        options={projectOptions}
        onChange={onProjectChange}
        placeholder="Pick a project"
        searchable
      />
      <TextField
        label="What are you working on?"
        value={description}
        onChangeText={onDescriptionChange}
        optional
        maxLength={2000}
      />
      <Button
        label="Start the timer"
        icon="play"
        variant="primary"
        fullWidth
        disabled={projectId == null}
        onPress={onStart}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.m },
});
