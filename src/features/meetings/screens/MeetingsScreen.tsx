import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import { addDays, companyToday, dayKey, relDay } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Card,
  EmptyState,
  IconButton,
  InlineError,
  Screen,
  ScreenHeader,
  Section,
  Segmented,
  Skeleton,
} from "@/ui";
import { useMeetings } from "../api";
import { MeetingRow } from "../components/MeetingRow";

type Range = "upcoming" | "past";

const DAYS_SHOWN = 90;

/** Meetings of the projects the person can see: the next three months, or the last three. */
export function MeetingsScreen() {
  const perms = usePermissions();
  const [range, setRange] = useState<Range>("upcoming");
  const today = companyToday();
  const meetings = useMeetings(
    range === "upcoming"
      ? { from: today, to: addDays(today, DAYS_SHOWN) }
      : { from: addDays(today, -DAYS_SHOWN), to: addDays(today, -1) },
  );
  const banner = useOfflineBanner(meetings.dataUpdatedAt);
  const list = range === "upcoming" ? (meetings.data ?? []) : [...(meetings.data ?? [])].reverse();
  const days: { day: string; items: typeof list }[] = [];
  for (const m of list) {
    const day = dayKey(m.startsAt);
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(m);
    else days.push({ day, items: [m] });
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title="Meetings"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/more"))}
          actions={
            perms.has(P.MEETING_CREATE) ? (
              <IconButton
                icon="plus"
                accessibilityLabel="Schedule a meeting"
                onPress={() => router.push("/meetings/new")}
              />
            ) : null
          }
        />
      }
      banner={banner}
      refreshing={meetings.isRefetching}
      onRefresh={() => void meetings.refetch()}
    >
      <Section>
        <Segmented
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
          value={range}
          onChange={setRange}
        />
      </Section>
      {meetings.isError && !meetings.data ? (
        <InlineError
          what="the meetings"
          message={toApiError(meetings.error).message}
          onRetry={() => void meetings.refetch()}
        />
      ) : !meetings.data ? (
        <Skeleton lines={5} height={18} />
      ) : days.length === 0 ? (
        <EmptyState
          art="time"
          title={range === "upcoming" ? "No meetings coming up" : "No meetings lately"}
        />
      ) : (
        days.map(({ day, items }) => (
          <Section key={day} title={relDay(day)}>
            <Card padded={false}>
              {items.map((m, i) => (
                <MeetingRow
                  key={m.id}
                  meeting={m}
                  divider={i < items.length - 1}
                  onPress={() =>
                    router.push({ pathname: "/meetings/[id]", params: { id: String(m.id) } })
                  }
                />
              ))}
            </Card>
          </Section>
        ))
      )}
    </Screen>
  );
}
