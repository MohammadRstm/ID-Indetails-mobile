import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { useOfflineBanner } from "@/offline/useOnline";
import {
  addMonths,
  companyToday,
  fmtDate,
  fmtDayDateY,
  fmtDur,
  fmtH,
  fmtMonthY,
  monthKey,
  relDay,
} from "@/format/time";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  InlineError,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Segmented,
  Skeleton,
} from "@/ui";
import { WeekBars } from "@/ui/charts";
import {
  useMyDay,
  useMyEntries,
  useMyHours,
  useMyOvertime,
  useMySchedule,
  useMyWorkSummary,
} from "../api";
import { EntryRow } from "../components/EntryRow";
import { StatTiles } from "../components/StatTiles";
import { requestLogWork } from "../logWorkRequest";
import { groupByDay, LEDGER_STATUS, weekColumns, weekSummary } from "../model";

type View = "week" | "overtime" | "balance";

const VIEWS: { value: View; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "overtime", label: "Overtime" },
  { value: "balance", label: "Balance" },
];

const openEntry = (id: number) =>
  router.push({ pathname: "/work/entry/[id]", params: { id: String(id) } });

/** The Design person's work: the week and its days, overtime, and the hours balance. */
export function WorkScreen() {
  const [view, setView] = useState<View>("week");
  const summary = useMyWorkSummary();
  const banner = useOfflineBanner(summary.dataUpdatedAt);

  return (
    <Screen
      header={
        <ScreenHeader
          title="Work"
          actions={
            <IconButton
              icon="plus"
              accessibilityLabel="Log work"
              onPress={() => {
                requestLogWork({});
                router.push("/log-work");
              }}
            />
          }
        />
      }
      banner={banner}
      refreshing={summary.isRefetching}
      onRefresh={() => void summary.refetch()}
    >
      <Section>
        <Segmented options={VIEWS} value={view} onChange={setView} accessibilityLabel="Show" />
      </Section>
      {view === "week" ? <WeekView /> : view === "overtime" ? <OvertimeView /> : <BalanceView />}
    </Screen>
  );
}

function WeekView() {
  const today = companyToday();
  const [selected, setSelected] = useState(today);
  const summary = useMyWorkSummary();
  const schedule = useMySchedule(today);
  const day = useMyDay(selected);
  const entries = useMyEntries();

  if (summary.isError && !summary.data) {
    const error = toApiError(summary.error);
    return (
      <InlineError
        what="your week"
        message={error.message}
        onRetry={() => void summary.refetch()}
      />
    );
  }
  if (!summary.data) return <Skeleton lines={6} height={18} />;

  const s = summary.data;
  const columns = weekColumns(s.week, schedule.data?.schedule.days ?? [], today);
  const earlier = groupByDay(entries.data?.pages.flatMap((p) => p.items) ?? []);

  return (
    <>
      <Section>
        <StatTiles
          stats={[
            { label: "Today", value: fmtH(s.todayMinutes) },
            {
              label: "This week",
              value: fmtH(s.thisWeekMinutes),
              sub: `Last ${fmtH(s.lastWeekMinutes)}`,
            },
            { label: "This month", value: fmtH(s.thisMonthMinutes) },
          ]}
        />
      </Section>
      <Section title="This week">
        <Card>
          <WeekBars
            days={columns}
            accessibilityLabel="Hours this week"
            summary={weekSummary(columns, s.thisWeekMinutes)}
            selectedKey={selected}
            onSelectDay={setSelected}
          />
        </Card>
      </Section>
      <Section
        title={relDay(selected)}
        action={{
          label: "Log work",
          onPress: () => {
            requestLogWork({ date: selected });
            router.push("/log-work");
          },
        }}
      >
        {day.isError && !day.data ? (
          <InlineError
            what="the day"
            message={toApiError(day.error).message}
            onRetry={() => void day.refetch()}
          />
        ) : !day.data ? (
          <Skeleton lines={3} height={16} />
        ) : day.data.entries.length === 0 ? (
          <Card>
            <EmptyState art="time" title="Nothing logged" text={fmtDayDateY(selected)} />
          </Card>
        ) : (
          <Card padded={false}>
            {day.data.entries.map((entry, i) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                divider={i < day.data.entries.length - 1}
                onPress={() => openEntry(entry.id)}
              />
            ))}
          </Card>
        )}
      </Section>
      <Section title="All entries">
        {entries.isError && !entries.data ? (
          <InlineError
            what="your entries"
            message={toApiError(entries.error).message}
            onRetry={() => void entries.refetch()}
          />
        ) : !entries.data ? (
          <Skeleton lines={4} height={16} />
        ) : earlier.length === 0 ? (
          <EmptyState
            art="time"
            title="No work logged yet"
            text="Log work or start the timer from Today."
          />
        ) : (
          earlier.map((group) => (
            <Card key={group.day} padded={false}>
              <ListRow
                title={relDay(group.day)}
                subtitle={fmtDate(group.day)}
                trailing={
                  <Badge label={fmtDur(group.entries.reduce((sum, e) => sum + e.minutes, 0))} />
                }
                divider
              />
              {group.entries.map((entry, i) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  divider={i < group.entries.length - 1}
                  onPress={() => openEntry(entry.id)}
                />
              ))}
            </Card>
          ))
        )}
        {entries.hasNextPage ? (
          <Button
            label="Show older entries"
            variant="quiet"
            loading={entries.isFetchingNextPage}
            onPress={() => void entries.fetchNextPage()}
          />
        ) : null}
      </Section>
      <Section>
        <Card padded={false}>
          <ListRow
            title="My pay"
            subtitle="Each month's hours, day by day"
            chevron
            onPress={() => router.push("/pay")}
          />
        </Card>
      </Section>
    </>
  );
}

function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const current = monthKey(companyToday());
  return (
    <ListRow
      title={fmtMonthY(month)}
      leading={
        <IconButton
          icon="chevronLeft"
          accessibilityLabel="Previous month"
          onPress={() => onChange(addMonths(month, -1))}
        />
      }
      trailing={
        <IconButton
          icon="chevronRight"
          accessibilityLabel="Next month"
          disabled={month >= current}
          onPress={() => onChange(addMonths(month, 1))}
        />
      }
    />
  );
}

function OvertimeView() {
  const [month, setMonth] = useState(monthKey(companyToday()));
  const overtime = useMyOvertime(month);

  return (
    <>
      <Section>
        <Card padded={false}>
          <MonthSwitcher month={month} onChange={setMonth} />
        </Card>
      </Section>
      {overtime.isError && !overtime.data ? (
        <InlineError
          what="your overtime"
          message={toApiError(overtime.error).message}
          onRetry={() => void overtime.refetch()}
        />
      ) : !overtime.data ? (
        <Skeleton lines={4} height={16} />
      ) : (
        <>
          <Section>
            <StatTiles
              stats={[
                { label: "Overtime", value: fmtH(overtime.data.overtimeMinutes) },
                ...(overtime.data.madeUpMinutes != null
                  ? [{ label: "Made up hours", value: fmtH(overtime.data.madeUpMinutes) }]
                  : []),
                ...(overtime.data.paidMinutes != null
                  ? [{ label: "Paid as overtime", value: fmtH(overtime.data.paidMinutes) }]
                  : []),
              ]}
            />
          </Section>
          {overtime.data.days.length === 0 ? (
            <EmptyState art="time" title="No overtime this month" />
          ) : (
            overtime.data.days.map((day) => (
              <Section
                key={day.date}
                title={`${relDay(day.date)} · ${fmtDur(day.overtimeMinutes)} overtime${day.dayOff ? " · day off" : ""}`}
              >
                <Card padded={false}>
                  {day.entries.map((entry, i) => (
                    <ListRow
                      key={entry.workEntryId}
                      title={entry.projectTitle}
                      subtitle={entry.description}
                      trailing={<Badge label={`${fmtDur(entry.overtimeMinutes)} OT`} tone="warn" />}
                      divider={i < day.entries.length - 1}
                      onPress={() => openEntry(entry.workEntryId)}
                    />
                  ))}
                </Card>
              </Section>
            ))
          )}
        </>
      )}
    </>
  );
}

function BalanceView() {
  const hours = useMyHours();

  if (hours.isError && !hours.data) {
    return (
      <InlineError
        what="your hours"
        message={toApiError(hours.error).message}
        onRetry={() => void hours.refetch()}
      />
    );
  }
  if (!hours.data) return <Skeleton lines={5} height={16} />;
  if (!hours.data.applies || hours.data.months.length === 0) {
    return (
      <EmptyState art="time" title="No hours balance" text="It applies to people who log hours." />
    );
  }

  return (
    <Section title="Month by month">
      <Card padded={false}>
        {hours.data.months.map((month, i) => {
          const status = LEDGER_STATUS[month.status];
          return (
            <ListRow
              key={month.month}
              title={fmtMonthY(month.month)}
              subtitle={
                month.shortMinutes > 0
                  ? `${fmtH(month.shortMinutes)} short of ${fmtH(month.expectedMinutes)}`
                  : `${fmtH(month.insideMinutes + month.madeUpMinutes)} of ${fmtH(month.expectedMinutes)}`
              }
              trailing={<Badge label={status.label} tone={status.tone} />}
              divider={i < hours.data.months.length - 1}
              onPress={() => router.push({ pathname: "/pay", params: { month: month.month } })}
            />
          );
        })}
      </Card>
    </Section>
  );
}
