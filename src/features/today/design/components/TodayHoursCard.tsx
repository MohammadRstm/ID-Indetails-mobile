import { StyleSheet, View } from "react-native";
import { fmtDur, fmtH, type DateValue } from "@/format/time";
import { spacing } from "@/theme/tokens";
import { Bar, Card, Text } from "@/ui";
import { DayRuler, ProgressRing, type RulerBlock } from "@/ui/charts";

type TodayHoursCardProps = {
  loggedMinutes: number;
  requiredMinutes: number;
  leftMinutes: number;
  overtimeMinutes: number;
  isWorkingDay: boolean;
  blocks: RulerBlock[];
  now: DateValue;
  weekMinutes: number;
  weekRequiredMinutes: number;
};

/** Today's hours against what the day asks for, where they sit in the day, and the week so far. */
export function TodayHoursCard(props: TodayHoursCardProps) {
  const dayShare = props.requiredMinutes ? props.loggedMinutes / props.requiredMinutes : 0;
  const weekShare = props.weekRequiredMinutes ? props.weekMinutes / props.weekRequiredMinutes : 0;
  return (
    <Card>
      <View style={styles.head}>
        <ProgressRing
          value={dayShare}
          tone={dayShare >= 1 ? "ok" : "accent"}
          size={84}
          accessibilityLabel={`${fmtDur(props.loggedMinutes)} logged today`}
        >
          <Text variant="mono">{fmtH(props.loggedMinutes)}</Text>
        </ProgressRing>
        <View style={styles.text}>
          <Text variant="micro">Today</Text>
          <Text variant="subheading">
            {props.isWorkingDay
              ? `${fmtDur(props.loggedMinutes)} of ${fmtDur(props.requiredMinutes)}`
              : `Day off · ${fmtDur(props.loggedMinutes)} logged`}
          </Text>
          <Text variant="small" tone="muted">
            {props.isWorkingDay && props.leftMinutes > 0
              ? `${fmtDur(props.leftMinutes)} left to log`
              : props.isWorkingDay
                ? "The day's hours are logged"
                : "Everything logged today is overtime"}
            {props.overtimeMinutes > 0 ? ` · ${fmtDur(props.overtimeMinutes)} overtime` : ""}
          </Text>
        </View>
      </View>
      <DayRuler blocks={props.blocks} now={props.now} />
      <View style={styles.week}>
        <View style={styles.weekText}>
          <Text variant="micro">This week</Text>
          <Text variant="small" tone="secondary">
            {fmtH(props.weekMinutes)}
            {props.weekRequiredMinutes ? ` of ${fmtH(props.weekRequiredMinutes)}` : ""}
          </Text>
        </View>
        <Bar
          value={weekShare}
          tone={weekShare >= 1 ? "ok" : "accent"}
          accessibilityLabel="This week's hours"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing.l },
  text: { flex: 1, gap: spacing.xxs },
  week: { gap: spacing.s },
  weekText: { flexDirection: "row", justifyContent: "space-between" },
});
