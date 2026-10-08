import { router } from "expo-router";
import { toApiError } from "@/api/errors";
import { useCurrentUser } from "@/auth/session";
import { MeetingRow } from "@/features/meetings/components/MeetingRow";
import { MyRequirementRow } from "@/features/requirements/components/MyRequirementRow";
import { useMyRequirements } from "@/features/requirements/api";
import { TimerPanel } from "@/features/timer/screens/TimerPanel";
import { useMyDay, useMySchedule, useMyWorkSummary } from "@/features/work/api";
import { requestLogWork } from "@/features/work/logWorkRequest";
import { companyToday, fmtDayDateY } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Button,
  Card,
  IconButton,
  InlineError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
} from "@/ui";
import { TodayHoursCard } from "../components/TodayHoursCard";

function logWork() {
  requestLogWork({});
  router.push("/log-work");
}

/** A Design employee's day: the timer, today's hours, the week, deadlines and today's meetings. */
export function DesignTodayScreen() {
  const me = useCurrentUser();
  const perms = usePermissions();
  const today = companyToday();
  const logs = perms.hasAll(P.WORK_ENTRY_CREATE, P.WORK_ENTRY_VIEW_OWN);
  const day = useMyDay(today, logs);
  const schedule = useMySchedule(today, logs);
  const summary = useMyWorkSummary(logs);
  const requirements = useMyRequirements(perms.has(P.REQUIREMENT_VIEW));
  const banner = useOfflineBanner(day.dataUpdatedAt);

  const deadlines = (requirements.data?.items ?? []).filter((r) => r.deadline).slice(0, 3);
  const meetings = day.data?.meetings ?? [];
  const refresh = () => {
    void day.refetch();
    void schedule.refetch();
    void summary.refetch();
    void requirements.refetch();
  };
  const hoursError = [day, schedule].find((q) => q.isError && !q.data)?.error;

  return (
    <Screen
      header={
        <ScreenHeader
          title={`Hi ${me.firstName}`}
          subtitle={fmtDayDateY(today)}
          actions={
            logs ? <IconButton icon="plus" accessibilityLabel="Log work" onPress={logWork} /> : null
          }
        />
      }
      banner={banner}
      refreshing={day.isRefetching}
      onRefresh={refresh}
    >
      {logs ? (
        <>
          <Section>
            <TimerPanel />
          </Section>
          <Section title="Your hours">
            {hoursError ? (
              <InlineError
                what="your hours"
                message={toApiError(hoursError).message}
                onRetry={refresh}
              />
            ) : day.data && schedule.data ? (
              <TodayHoursCard
                loggedMinutes={schedule.data.day.loggedMinutes}
                requiredMinutes={schedule.data.day.requiredMinutes}
                leftMinutes={schedule.data.day.leftMinutes}
                overtimeMinutes={schedule.data.day.overtimeMinutes}
                isWorkingDay={schedule.data.day.isWorkingDay}
                blocks={day.data.entries.map((e) => ({ start: e.startedAt, end: e.endedAt }))}
                now={new Date()}
                weekMinutes={summary.data?.thisWeekMinutes ?? 0}
                weekRequiredMinutes={schedule.data.schedule.requiredMinutesPerWeek}
              />
            ) : (
              <Skeleton height={150} radius={9} />
            )}
            <Button label="Log work" icon="plus" variant="primary" fullWidth onPress={logWork} />
          </Section>
        </>
      ) : null}
      {deadlines.length > 0 ? (
        <Section
          title="Deadlines"
          action={{ label: "All", onPress: () => router.push("/requirements") }}
        >
          <Card padded={false}>
            {deadlines.map((r, i) => (
              <MyRequirementRow
                key={r.id}
                requirement={r}
                divider={i < deadlines.length - 1}
                onPress={() =>
                  router.push({
                    pathname: "/projects/[id]/requirements",
                    params: { id: String(r.project.id), requirementId: String(r.id) },
                  })
                }
              />
            ))}
          </Card>
        </Section>
      ) : null}
      <Section
        title="Today's meetings"
        action={
          perms.has(P.PROJECT_VIEW)
            ? { label: "All meetings", onPress: () => router.push("/meetings") }
            : undefined
        }
      >
        {meetings.length === 0 ? (
          <Text variant="small" tone="muted">
            No meetings today.
          </Text>
        ) : (
          <Card padded={false}>
            {meetings.map((m, i) => (
              <MeetingRow
                key={m.id}
                meeting={m}
                divider={i < meetings.length - 1}
                onPress={() =>
                  router.push({ pathname: "/meetings/[id]", params: { id: String(m.id) } })
                }
              />
            ))}
          </Card>
        )}
      </Section>
    </Screen>
  );
}
