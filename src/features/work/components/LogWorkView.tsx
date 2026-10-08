import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { fmtDayDate, fmtDur, type DateValue } from "@/format/time";
import { spacing } from "@/theme/tokens";
import {
  Badge,
  Button,
  Card,
  InlineError,
  Select,
  Text,
  TextField,
  TimeField,
  type SelectOption,
} from "@/ui";
import { DayRuler, type RulerBlock } from "@/ui/charts";
import { DayChips } from "./DayChips";

type LogWorkViewProps = {
  projectOptions: SelectOption<number>[];
  projectId: number | null;
  onProjectChange: (id: number) => void;
  days: string[];
  date: string;
  onDateChange: (day: string) => void;
  startMin: number;
  endMin: number;
  onStartChange: (minutes: number) => void;
  onEndChange: (minutes: number) => void;
  duration: number;
  endsNextDay: boolean;
  /** Where this log and the day's other entries sit. */
  block: RulerBlock;
  others: RulerBlock[];
  now?: DateValue;
  /** The API's overtime preview, in words; null when none of it is overtime. */
  overtime: string | null;
  overtimeMinutes: number;
  description: string;
  onDescriptionChange: (text: string) => void;
  descriptionRequired: boolean;
  descriptionError?: string;
  /** How long a short timer run really was, when it is logged as 5 minutes. */
  shortTimer?: number;
  attachment: ReactNode;
  /** What stops the save, in words. */
  problem: string | null;
  saving: boolean;
  editing: boolean;
  onSave: () => void;
  /** Starts the timer instead, when the domain allows it. */
  onUseTimer?: () => void;
};

/** Logging or editing work on the phone: the project, the day, the times, what was done, and a photo. */
export function LogWorkView(props: LogWorkViewProps) {
  const saveLabel = props.editing
    ? "Save changes"
    : `Log ${fmtDur(props.duration)}${props.overtimeMinutes ? ` · ${fmtDur(props.overtimeMinutes)} overtime` : ""}`;

  return (
    <View style={styles.form}>
      <Select
        label="Project"
        value={props.projectId}
        options={props.projectOptions}
        onChange={props.onProjectChange}
        placeholder="Pick a project"
        hint="Only active projects take new work."
        searchable
      />
      <View style={styles.field}>
        <Text variant="label" tone="secondary">
          Day
        </Text>
        <DayChips days={props.days} value={props.date} onChange={props.onDateChange} />
      </View>
      <Card style={styles.times}>
        <View style={styles.row}>
          <View style={styles.half}>
            <TimeField label="Start" value={props.startMin} onChange={props.onStartChange} />
          </View>
          <View style={styles.half}>
            <TimeField label="End" value={props.endMin} onChange={props.onEndChange} />
          </View>
        </View>
        <DayRuler blocks={[props.block]} others={props.others} now={props.now} />
        <Text variant="small" tone="secondary">
          {fmtDayDate(props.date)} · <Text variant="mono">{fmtDur(props.duration)}</Text>
          {props.endsNextDay ? " (ends the next day)" : ""}
        </Text>
        {props.overtime ? <Badge label={props.overtime} tone="warn" icon="clock" /> : null}
        {props.shortTimer != null ? (
          <Text variant="small" tone="muted">
            Your timer ran {props.shortTimer < 1 ? "under a minute" : fmtDur(props.shortTimer)}. An
            entry is at least 5 minutes, so it is logged as 5. Change the times if that isn’t right.
          </Text>
        ) : null}
      </Card>
      <TextField
        label="What did you work on?"
        value={props.description}
        onChangeText={props.onDescriptionChange}
        placeholder="e.g. Detailed the kitchen joinery drawings for the client review"
        optional={!props.descriptionRequired}
        error={props.descriptionError}
        multiline
        maxLength={2000}
      />
      {props.attachment}
      {props.problem ? <InlineError message={props.problem} /> : null}
      <Button
        label={saveLabel}
        variant="primary"
        size="large"
        fullWidth
        loading={props.saving}
        onPress={props.onSave}
      />
      {props.onUseTimer ? (
        <Button
          label="Use a timer instead"
          icon="play"
          variant="quiet"
          onPress={props.onUseTimer}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  field: { gap: spacing.s },
  times: { gap: spacing.m },
  row: { flexDirection: "row", gap: spacing.m },
  half: { flex: 1 },
});
