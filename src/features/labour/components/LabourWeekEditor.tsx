import { StyleSheet, View } from "react-native";
import { DAYS_LONG, fmtDate, partsOf } from "@/format/time";
import { spacing } from "@/theme/tokens";
import { Card, NumberField, Text, TextField } from "@/ui";
import type { WeekDraft } from "../model";

type LabourWeekEditorProps = {
  draft: WeekDraft;
  onChange: (draft: WeekDraft) => void;
  editable: boolean;
};

/** A site week, day by day: how many workers and their daily pay, and a note. */
export function LabourWeekEditor({ draft, onChange, editable }: LabourWeekEditorProps) {
  const setDay = (date: string, change: { workers?: number; dailyPay?: number }) =>
    onChange({
      ...draft,
      days: draft.days.map((d) => (d.date === date ? { ...d, ...change } : d)),
    });

  return (
    <View style={styles.list}>
      {draft.days.length === 0 ? (
        <Text variant="small" tone="muted">
          No days of this week have come yet.
        </Text>
      ) : null}
      {draft.days.map((day) => (
        <Card key={day.date} style={styles.day}>
          <Text variant="bodyStrong">
            {DAYS_LONG[partsOf(day.date).weekday]}
            <Text variant="small" tone="muted">
              {"  "}
              {fmtDate(day.date)}
            </Text>
          </Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <NumberField
                label="Workers"
                value={day.workers}
                decimals={0}
                disabled={!editable}
                onChange={(workers) => setDay(day.date, { workers: workers ?? 0 })}
              />
            </View>
            <View style={styles.half}>
              <NumberField
                label="Daily pay"
                value={day.dailyPay}
                suffix="USD"
                disabled={!editable}
                onChange={(dailyPay) => setDay(day.date, { dailyPay: dailyPay ?? 0 })}
              />
            </View>
          </View>
        </Card>
      ))}
      <TextField
        label="Note"
        value={draft.note}
        onChangeText={(note) => onChange({ ...draft, note })}
        optional
        multiline
        disabled={!editable}
        maxLength={2000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.m },
  day: { gap: spacing.m },
  row: { flexDirection: "row", gap: spacing.m },
  half: { flex: 1 },
});
