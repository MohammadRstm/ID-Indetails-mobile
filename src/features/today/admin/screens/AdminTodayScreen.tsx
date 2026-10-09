import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useCurrentUser } from "@/auth/session";
import { companyToday, fmtDayDate, fmtTime } from "@/format/time";
import { routeForTarget } from "@/navigation/targets";
import { P } from "@/permissions/codes";
import { canOpen } from "@/permissions/screens";
import { usePermissions } from "@/permissions/usePermissions";
import { spacing } from "@/theme/tokens";
import {
  Badge,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  Text,
} from "@/ui";
import {
  useAttention,
  useDeadlines,
  useMeetingsOn,
  useUnreadNotifications,
  type AttentionItem,
  type Deadline,
} from "../api";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** How far a requirement's deadline is, in words ("2 days overdue", "Due today", "3 days left"). */
export function deadlineWords(d: Pick<Deadline, "daysLeft" | "isOverdue">): string {
  const days = Math.abs(d.daysLeft);
  if (d.isOverdue) return `${plural(days, "day")} overdue`;
  return days === 0 ? "Due today" : `${plural(days, "day")} left`;
}

/** An admin's day: what is late or due soon, which projects need a look, today's meetings and unread alerts. */
export function AdminTodayScreen() {
  const me = useCurrentUser();
  const perms = usePermissions();
  // Admins belong to one domain; the Design-only reports are asked for only there.
  const domain = perms.homeDomain ?? "design";
  const today = companyToday();
  const seesReports = perms.has(P.REPORT_VIEW);
  const deadlines = useDeadlines(domain, seesReports);
  const attention = useAttention(seesReports && domain === "design");
  const meetings = useMeetingsOn(domain, today);
  const unread = useUnreadNotifications();

  const quiet = attention.data?.filter((a) => a.kind === "idle") ?? [];
  const nearlyDone = attention.data?.filter((a) => a.kind === "closeout") ?? [];
  const alerts = routeForTarget({ type: "page", page: "notifications" }, perms);
  const canOpenMeeting = canOpen(perms, "meeting");
  const refetch = () => {
    void deadlines.refetch();
    void attention.refetch();
    void meetings.refetch();
    void unread.refetch();
  };

  const projectHref = (id: number | null) =>
    id == null ? null : routeForTarget({ type: "project", id, domain }, perms);

  return (
    <Screen
      header={
        <ScreenHeader
          title={`Hello, ${me.firstName ?? "there"}`}
          subtitle={fmtDayDate(today)}
          actions={
            perms.has(P.PROTON_USE) ? (
              <IconButton
                icon="compass"
                accessibilityLabel="Ask Proton"
                onPress={() => router.push("/proton")}
              />
            ) : undefined
          }
        />
      }
      refreshing={deadlines.isRefetching || meetings.isRefetching}
      onRefresh={refetch}
    >
      <View style={styles.body}>
        {unread.data ? (
          <Card
            onPress={alerts ? () => router.push(alerts) : undefined}
            accessibilityLabel={plural(unread.data, "unread alert")}
          >
            <Text variant="bodyStrong">{plural(unread.data, "unread alert")}</Text>
          </Card>
        ) : null}

        {seesReports ? (
          <Section
            title={
              deadlines.data && deadlines.data.overdue > 0
                ? `Deadlines · ${deadlines.data.overdue} overdue`
                : "Deadlines"
            }
          >
            {!deadlines.data ? (
              deadlines.error ? (
                <Text tone="muted">Couldn&apos;t load the deadlines.</Text>
              ) : (
                <Skeleton lines={3} height={18} />
              )
            ) : deadlines.data.items.length === 0 ? (
              <EmptyState art="projects" title="Nothing due in the next two weeks" />
            ) : (
              <Card padded={false}>
                {deadlines.data.items.map((d, i) => {
                  const href = routeForTarget(
                    {
                      type: "requirement",
                      projectId: d.project.id,
                      requirementId: d.requirementId,
                      domain,
                    },
                    perms,
                  );
                  return (
                    <ListRow
                      key={d.requirementId}
                      title={d.text}
                      subtitle={d.project.title}
                      trailing={
                        <Badge label={deadlineWords(d)} tone={d.isOverdue ? "warn" : "neutral"} />
                      }
                      chevron={href != null}
                      divider={i < deadlines.data.items.length - 1}
                      onPress={href ? () => router.push(href) : undefined}
                    />
                  );
                })}
              </Card>
            )}
          </Section>
        ) : null}

        <AttentionList
          title="Quiet projects"
          items={quiet}
          words={(a) => `${plural(a.days ?? 0, "day")} without work`}
          hrefOf={projectHref}
        />
        <AttentionList
          title="Nearly done"
          items={nearlyDone}
          words={(a) => `${a.progressPct ?? 0}% done`}
          hrefOf={projectHref}
        />

        <Section title="Today's meetings">
          {!meetings.data ? (
            meetings.error ? (
              <Text tone="muted">Couldn&apos;t load the meetings.</Text>
            ) : (
              <Skeleton lines={2} height={18} />
            )
          ) : meetings.data.length === 0 ? (
            <Text tone="muted">No meetings today.</Text>
          ) : (
            <Card padded={false}>
              {meetings.data.map((m, i) => (
                <ListRow
                  key={m.id}
                  title={m.topic ?? m.project.title}
                  subtitle={`${fmtTime(m.startsAt)} to ${fmtTime(m.endsAt)} · ${m.project.title}`}
                  chevron={canOpenMeeting}
                  divider={i < meetings.data.length - 1}
                  onPress={
                    canOpenMeeting
                      ? () =>
                          router.push({ pathname: "/meetings/[id]", params: { id: String(m.id) } })
                      : undefined
                  }
                />
              ))}
            </Card>
          )}
        </Section>
      </View>
    </Screen>
  );
}

type AttentionListProps = {
  title: string;
  items: AttentionItem[];
  words: (item: AttentionItem) => string;
  hrefOf: (projectId: number | null) => Href | null;
};

function AttentionList({ title, items, words, hrefOf }: AttentionListProps) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <Card padded={false}>
        {items.map((a, i) => {
          const href = hrefOf(a.projectId);
          return (
            <ListRow
              key={`${a.kind}-${a.projectId}`}
              title={a.title ?? "Project"}
              subtitle={words(a)}
              chevron={href != null}
              divider={i < items.length - 1}
              onPress={href ? () => router.push(href) : undefined}
            />
          );
        })}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.l } });
