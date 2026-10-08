import { router, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import type { ActivityItem } from "@/api/types";
import { personName, useEmployees } from "@/features/people/api";
import { dayKey, fmtDateY, fmtDayDate, fmtDur, fmtRange, relDay, relTime } from "@/format/time";
import { routeForTarget } from "@/navigation/targets";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import type { FeedDay } from "./components/FeedDays";
import type { FeedRowItem } from "./components/FeedRow";
import { feedWords } from "./feedWords";

export type FeedRowOf = (
  item: ActivityItem,
  options?: { hideProject?: boolean },
) => { row: FeedRowItem; target: Href | null };

/**
 * Turns feed events into rows: the web's wording, who did it, when, and where tapping it goes (its project, or its
 * client, when this person may open them). People named by id get their names from the people list.
 */
export function useFeedRows(): FeedRowOf {
  const perms = usePermissions();
  const people = useEmployees({}, perms.has(P.EMPLOYEE_VIEW));
  const names = useMemo(
    () => new Map((people.data ?? []).map((p) => [p.id, personName(p)])),
    [people.data],
  );

  return useCallback<FeedRowOf>(
    (item, { hideProject = false } = {}) => {
      // The API sends amounts only with financial:view; the phone never shows them without it either.
      const event = perms.has(P.FINANCIAL_VIEW) ? item : { ...item, amount: null, prevAmount: null };
      let target: Href | null = null;
      if (item.project && !hideProject && item.domain) {
        target = routeForTarget(
          { type: "project", id: item.project.id, domain: item.domain as "design" | "execution" },
          perms,
        );
      } else if (item.client && !item.project) {
        target = routeForTarget({ type: "client", id: item.client.id }, perms);
      }

      const entry = item.kind === "work_entry_logged" ? item.workEntry : null;
      if (entry) {
        return {
          target,
          row: {
            key: String(item.id),
            icon: "clock",
            actor: entry.person.name,
            text: `logged ${fmtDur(entry.minutes)}${hideProject ? "" : ` on ${entry.project.title}`}`,
            quote: entry.description,
            meta: `${fmtDayDate(entry.startedAt)} · ${fmtRange(entry.startedAt, entry.endedAt)} · logged ${relTime(entry.createdAt)}`,
          },
        };
      }

      const { icon, text } = feedWords(event, (id) => names.get(id));
      return {
        target,
        row: {
          key: String(item.id),
          icon,
          actor: item.actor?.name ?? null,
          text,
          meta: relTime(item.occurredAt),
        },
      };
    },
    [perms, names],
  );
}

/** The events by the company day they happened, newest first, as rows that open what they are about. */
export function useFeedDays(items: ActivityItem[], options: { hideProject?: boolean } = {}): FeedDay[] {
  const rowOf = useFeedRows();
  const days: FeedDay[] = [];
  for (const item of items) {
    const key = dayKey(item.occurredAt);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, label: `${relDay(item.occurredAt)} · ${fmtDateY(item.occurredAt)}`, rows: [] };
      days.push(day);
    }
    const { row, target } = rowOf(item, options);
    day.rows.push({ row, onPress: target ? () => router.push(target) : undefined });
  }
  return days;
}
