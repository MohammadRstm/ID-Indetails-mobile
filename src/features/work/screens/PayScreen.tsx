import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import {
  addMonths,
  companyToday,
  fmtDate,
  fmtDur,
  fmtH,
  fmtMonthY,
  monthKey,
  relDay,
} from "@/format/time";
import {
  Badge,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
} from "@/ui";
import { useMyPay } from "../api";
import { StatTiles } from "../components/StatTiles";
import { LEDGER_STATUS } from "../model";

const MONTH = /^\d{4}-\d{2}$/;

/**
 * My pay: a month's hours as pay counts them, day by day, with its excuses. Money figures are left out on the
 * phone (phase-0-plan.md section 15); the month's salary stays on the web.
 */
export function PayScreen() {
  const param = useLocalSearchParams<{ month?: string }>().month;
  const current = monthKey(companyToday());
  const [month, setMonth] = useState(
    param && MONTH.test(param) && param <= current ? param : current,
  );
  const pay = useMyPay(month);
  const data = pay.data;
  const first = data?.firstMonth ?? month;

  return (
    <Screen
      header={<ScreenHeader title="My pay" onBack={() => router.back()} />}
      refreshing={pay.isRefetching}
      onRefresh={() => void pay.refetch()}
    >
      <Section>
        <Card padded={false}>
          <ListRow
            title={fmtMonthY(month)}
            subtitle={data?.inProgress ? "In progress" : undefined}
            leading={
              <IconButton
                icon="chevronLeft"
                accessibilityLabel="Previous month"
                disabled={month <= first}
                onPress={() => setMonth(addMonths(month, -1))}
              />
            }
            trailing={
              <IconButton
                icon="chevronRight"
                accessibilityLabel="Next month"
                disabled={month >= current}
                onPress={() => setMonth(addMonths(month, 1))}
              />
            }
          />
        </Card>
      </Section>
      {pay.isError && !data ? (
        <LoadError
          what="this month"
          message={toApiError(pay.error).message}
          traceId={toApiError(pay.error).traceId}
          onRetry={() => void pay.refetch()}
        />
      ) : !data ? (
        <Skeleton lines={6} height={18} />
      ) : (
        <>
          {data.ledger ? (
            <Section title="Hours">
              <Card>
                <Badge
                  label={LEDGER_STATUS[data.ledger.status].label}
                  tone={LEDGER_STATUS[data.ledger.status].tone}
                />
                <Text variant="small" tone="secondary">
                  {data.ledger.inProgress
                    ? `The month asks for ${fmtH(data.ledger.expectedFullMonthMinutes)}; ${fmtH(data.ledger.expectedMinutes)} so far.`
                    : `The month asked for ${fmtH(data.ledger.expectedMinutes)}.`}
                </Text>
              </Card>
              <StatTiles
                stats={[
                  { label: "Within hours", value: fmtH(data.ledger.insideMinutes) },
                  { label: "Made up", value: fmtH(data.ledger.madeUpMinutes) },
                  { label: "Short", value: fmtH(data.ledger.shortMinutes) },
                ]}
              />
              <StatTiles
                stats={[
                  { label: "Paid overtime", value: fmtH(data.ledger.overtimePaidMinutes) },
                  { label: "Excused", value: fmtH(data.ledger.excusedMinutes) },
                  { label: "Missed days", value: String(data.ledger.missedDays.length) },
                ]}
              />
            </Section>
          ) : null}
          <Section title="Days">
            {data.days.length === 0 ? (
              <EmptyState art="time" title="No days yet this month" />
            ) : (
              <Card padded={false}>
                {data.days.map((day, i) => (
                  <ListRow
                    key={day.date}
                    title={`${relDay(day.date)} · ${fmtDate(day.date)}`}
                    subtitle={
                      day.dayOff
                        ? "Day off"
                        : day.excused
                          ? "Excused"
                          : `${fmtDur(day.loggedMinutes)} of ${fmtDur(day.requiredMinutes)}`
                    }
                    trailing={
                      day.overtimeMinutes > 0 ? (
                        <Badge label={`${fmtDur(day.overtimeMinutes)} OT`} tone="warn" />
                      ) : day.differenceMinutes != null && day.differenceMinutes < 0 ? (
                        <Badge label={`${fmtDur(-day.differenceMinutes)} short`} tone="now" />
                      ) : undefined
                    }
                    divider={i < data.days.length - 1}
                  />
                ))}
              </Card>
            )}
          </Section>
          {data.excuses.length > 0 ? (
            <Section title="Excused">
              <Card padded={false}>
                {data.excuses.map((excuse, i) => (
                  <ListRow
                    key={`${excuse.kind}-${i}`}
                    title={
                      excuse.kind === "whole_month"
                        ? "The whole month"
                        : excuse.kind === "days"
                          ? excuse.days.map((d) => fmtDate(d)).join(", ")
                          : fmtH(excuse.minutes ?? 0)
                    }
                    subtitle={excuse.note || undefined}
                    trailing={
                      <Badge
                        label={excuse.isPaid ? "Paid" : "Unpaid"}
                        tone={excuse.isPaid ? "ok" : "warn"}
                      />
                    }
                    divider={i < data.excuses.length - 1}
                  />
                ))}
              </Card>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
