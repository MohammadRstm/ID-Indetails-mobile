import { StyleSheet, View } from "react-native";
import { DAYS, partsOf } from "@/format/time";
import { spacing } from "@/theme/tokens";
import { Button, Divider, InlineError, Sheet, Skeleton, Text } from "@/ui";

export type ConflictDay = { date: string; workers: number; dailyPay: number };

type LabourConflictSheetProps = {
  visible: boolean;
  weekLabel: string;
  mine: { days: ConflictDay[]; note: string | null };
  /** The week on the server now; null while it loads. */
  theirs: { days: ConflictDay[]; note: string | null; by: string | null } | null;
  error: string | null;
  busy: boolean;
  onUseMine: () => void;
  onKeepTheirs: () => void;
  onClose: () => void;
};

function DayLine({ day }: { day: ConflictDay }) {
  return (
    <View style={styles.line}>
      <Text variant="small">{DAYS[partsOf(day.date).weekday]}</Text>
      <Text variant="mono">
        {day.workers} × {day.dailyPay}
      </Text>
    </View>
  );
}

/** "Someone changed this week": the phone's version and the server's, side by side, and the two choices. */
export function LabourConflictSheet(props: LabourConflictSheetProps) {
  return (
    <Sheet
      visible={props.visible}
      onClose={props.onClose}
      title="Someone changed this week"
      subtitle={props.weekLabel}
      footer={
        <>
          <Button
            label="Keep theirs"
            variant="quiet"
            onPress={props.onKeepTheirs}
            disabled={props.busy}
          />
          <Button
            label="Use mine"
            variant="primary"
            onPress={props.onUseMine}
            loading={props.busy}
            disabled={!props.theirs}
          />
        </>
      }
    >
      <Text variant="small" tone="secondary">
        Workers × daily pay for each day. Use mine sends yours over theirs; keep theirs deletes
        yours.
      </Text>
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text variant="micro">Yours</Text>
          {props.mine.days.map((day) => (
            <DayLine key={day.date} day={day} />
          ))}
          {props.mine.note ? (
            <Text variant="small" tone="muted">
              {props.mine.note}
            </Text>
          ) : null}
        </View>
        <View style={styles.column}>
          <Text variant="micro">{props.theirs?.by ? `${props.theirs.by}'s` : "On the server"}</Text>
          {props.theirs ? (
            <>
              {props.theirs.days.map((day) => (
                <DayLine key={day.date} day={day} />
              ))}
              {props.theirs.note ? (
                <Text variant="small" tone="muted">
                  {props.theirs.note}
                </Text>
              ) : null}
            </>
          ) : props.error ? null : (
            <Skeleton lines={4} />
          )}
        </View>
      </View>
      <Divider />
      {props.error ? <InlineError message={props.error} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: "row", gap: spacing.l },
  column: { flex: 1, gap: spacing.s },
  line: { flexDirection: "row", justifyContent: "space-between" },
});
