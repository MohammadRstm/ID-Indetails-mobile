import { router } from "expo-router";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { toApiError } from "@/api/errors";
import type { Requirement } from "@/api/types";
import { useCurrentUser } from "@/auth/session";
import { AddToCalendarButton } from "@/features/calendar/AddToCalendarButton";
import { useProject } from "@/features/projects/api";
import { companyTimeToUtc } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/tokens";
import {
  Bar,
  Card,
  EmptyState,
  InlineError,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Segmented,
  Skeleton,
  Text,
} from "@/ui";
import { useProjectRequirements, useTickRequirement } from "../api";
import { RequirementRow } from "../components/RequirementRow";
import { canTick, orderRequirements } from "../model";
import { AddRequirementButton } from "../slots/AddRequirementButton";
import { RequirementManageActions } from "../slots/RequirementManageActions";

export type ProjectRequirementsScreenProps = {
  projectId: number;
  /** Scrolled to and highlighted (a push or link about one requirement). */
  highlightRequirementId: number | null;
};

type Show = "open" | "done" | "all";

/** A project's requirements: tick your own off, and see the project's progress follow. */
export function ProjectRequirementsScreen({
  projectId,
  highlightRequirementId,
}: ProjectRequirementsScreenProps) {
  const me = useCurrentUser();
  const perms = usePermissions();
  const { colors } = useTheme();
  const project = useProject(projectId);
  const list = useProjectRequirements(projectId);
  const tick = useTickRequirement(projectId);
  const banner = useOfflineBanner(list.dataUpdatedAt);
  const [show, setShow] = useState<Show>("all");
  const [ticking, setTicking] = useState<number | null>(null);
  const [tickError, setTickError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  // The highlighted row's place: the list's offset in the screen plus the row's in the list.
  const offsets = useRef<{ list?: number; row?: number; done?: boolean }>({});

  const status = project.data?.status;
  const projectOpen = status === "active" || status === "hold";
  const can = {
    manage: perms.has(P.REQUIREMENT_MANAGE),
    completeOwn: perms.has(P.REQUIREMENT_COMPLETE_OWN),
    projectOpen,
  };
  const items = orderRequirements(list.data?.items ?? []).filter(
    (r) => show === "all" || (show === "open" ? !r.isDone : r.isDone),
  );

  function scrollToHighlight(change: { list?: number; row?: number }) {
    const at = Object.assign(offsets.current, change);
    if (at.done || at.list == null || at.row == null) return;
    at.done = true;
    scroll.current?.scrollTo({ y: Math.max(0, at.list + at.row - spacing.xl), animated: true });
  }

  async function toggle(r: Requirement) {
    setTicking(r.id);
    setTickError(null);
    try {
      await tick.mutateAsync({ id: r.id, done: !r.isDone });
    } catch (error) {
      setTickError(toApiError(error).message);
    } finally {
      setTicking(null);
    }
  }

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <ScreenHeader
          title="Requirements"
          subtitle={project.data?.title}
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/today"))}
          actions={<AddRequirementButton projectId={projectId} />}
        />
      }
      banner={banner}
    >
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={colors.accent}
          />
        }
      >
        {list.isError && !list.data ? (
          <LoadError
            what="the requirements"
            message={toApiError(list.error).message}
            traceId={toApiError(list.error).traceId}
            onRetry={() => void list.refetch()}
          />
        ) : !list.data ? (
          <Skeleton lines={6} height={18} />
        ) : (
          <>
            <Section>
              <Card>
                <Text variant="small" tone="secondary">
                  {list.data.done} of {list.data.total} done
                  {list.data.overdue ? ` · ${list.data.overdue} overdue` : ""}
                </Text>
                <Bar value={list.data.progressPct / 100} accessibilityLabel="Progress" />
              </Card>
              <Segmented
                options={[
                  { value: "all", label: "All" },
                  { value: "open", label: "Open" },
                  { value: "done", label: "Done" },
                ]}
                value={show}
                onChange={setShow}
              />
            </Section>
            {tickError ? <InlineError message={tickError} /> : null}
            {items.length === 0 ? (
              <EmptyState
                art="done"
                title={show === "done" ? "Nothing done yet" : "No requirements"}
              />
            ) : (
              <View onLayout={(event) => scrollToHighlight({ list: event.nativeEvent.layout.y })}>
                <Card padded={false}>
                  {items.map((r, i) => (
                    <RequirementRow
                      key={r.id}
                      requirement={r}
                      canTick={canTick(r, me.id, can)}
                      ticking={ticking === r.id}
                      onToggle={() => void toggle(r)}
                      highlighted={r.id === highlightRequirementId}
                      divider={i < items.length - 1}
                      onLayout={
                        r.id === highlightRequirementId
                          ? (event) => scrollToHighlight({ row: event.nativeEvent.layout.y })
                          : undefined
                      }
                      actions={
                        <>
                          {r.deadline && !r.isDone ? (
                            <AddToCalendarButton
                              event={{
                                title: r.text,
                                startsAt: companyTimeToUtc(r.deadline, 0).toISOString(),
                                allDay: true,
                                notes: project.data?.title,
                              }}
                            />
                          ) : null}
                          <RequirementManageActions projectId={projectId} requirement={r} />
                        </>
                      }
                    />
                  ))}
                </Card>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.l, paddingBottom: spacing.xxxl * 2 },
});
