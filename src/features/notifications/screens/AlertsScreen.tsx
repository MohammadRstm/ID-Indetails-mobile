import { router } from "expo-router";
import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { Notification } from "@/api/types";
import { dayKey, relDay } from "@/format/time";
import { ProtonEntry } from "@/features/proton/slots/ProtonEntry";
import { routeForTarget } from "@/navigation/targets";
import { useOfflineBanner } from "@/offline/useOnline";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Button,
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
import { useMarkRead, useNotificationPages, useUnreadCount } from "../api";
import { NotificationItem } from "../components/NotificationItem";
import { useReader } from "../useReader";
import { describe } from "../words";

type Show = "all" | "unread";

/** The notification list: newest first, by day, with unread ones marked; a tap opens what it is about. */
export function AlertsScreen() {
  const perms = usePermissions();
  const reader = useReader();
  const [show, setShow] = useState<Show>("all");
  const pages = useNotificationPages(show === "unread");
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const banner = useOfflineBanner(pages.dataUpdatedAt);
  const items = pages.data?.pages.flatMap((p) => p.items) ?? [];

  const days: { day: string; items: Notification[] }[] = [];
  for (const note of items) {
    const day = dayKey(note.createdAt);
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(note);
    else days.push({ day, items: [note] });
  }

  function open(note: Notification) {
    if (!note.readAt) markRead.mutate(note.id);
    const { target } = describe(note, reader);
    const href = target ? routeForTarget(target, perms) : null;
    if (href) router.push(href);
  }

  return (
    <Screen
      header={
        <ScreenHeader
          title="Alerts"
          actions={
            <>
              <ProtonEntry page="notifications" compact />
              <IconButton
                icon="check"
                accessibilityLabel="Mark all read"
                disabled={!unread.data}
                onPress={() => markRead.mutate("all")}
              />
              <IconButton
                icon="settings"
                accessibilityLabel="Notification settings"
                onPress={() => router.push("/notifications/settings")}
              />
            </>
          }
        />
      }
      banner={banner}
      refreshing={pages.isRefetching}
      onRefresh={() => void pages.refetch()}
    >
      <Section>
        <Segmented
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: unread.data ? `Unread · ${unread.data}` : "Unread" },
          ]}
          value={show}
          onChange={setShow}
        />
      </Section>
      {pages.isError && !pages.data ? (
        <InlineError
          what="your notifications"
          message={toApiError(pages.error).message}
          onRetry={() => void pages.refetch()}
        />
      ) : !pages.data ? (
        <Skeleton lines={6} height={20} />
      ) : items.length === 0 ? (
        <EmptyState
          art="done"
          title={show === "unread" ? "All caught up" : "No notifications yet"}
          text="What happens on your projects shows here."
        />
      ) : (
        <>
          {days.map(({ day, items: dayItems }) => (
            <Section key={day} title={relDay(day)}>
              <Card padded={false}>
                {dayItems.map((note, i) => (
                  <NotificationItem
                    key={note.id}
                    view={describe(note, reader)}
                    createdAt={note.createdAt}
                    unread={!note.readAt}
                    divider={i < dayItems.length - 1}
                    onPress={() => open(note)}
                  />
                ))}
              </Card>
            </Section>
          ))}
          {pages.hasNextPage ? (
            <Button
              label="Show older"
              variant="quiet"
              loading={pages.isFetchingNextPage}
              onPress={() => void pages.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
