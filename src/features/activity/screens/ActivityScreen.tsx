import { router } from "expo-router";
import { useState } from "react";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import { Screen, ScreenHeader } from "@/ui";
import { useActivityFeed, type ActivityGroup } from "../api";
import { ChipRow, type ChipOption } from "../components/ChipRow";
import { FeedBody } from "../FeedBody";

type Kind = "all" | ActivityGroup;

/**
 * Everything that happened in Design, newest first (the web's Activity page, Design only), filtered by kind.
 * Work shows only to people who see everyone's work; amounts only with financial:view.
 */
export function ActivityScreen() {
  const perms = usePermissions();
  const [kind, setKind] = useState<Kind>("all");
  const feed = useActivityFeed({ domain: "design", group: kind === "all" ? undefined : kind });

  const kinds: ChipOption<Kind>[] = [
    { value: "all", label: "Everything" },
    ...(perms.has(P.WORK_ENTRY_VIEW_ALL) ? [{ value: "work" as const, label: "Work logged" }] : []),
    { value: "money", label: "Money" },
    { value: "billing", label: "Billing" },
    { value: "projects", label: "Projects" },
    { value: "people", label: "People" },
  ];

  return (
    <Screen
      header={
        <ScreenHeader
          title="Activity"
          subtitle="Everything that happened in Design, newest first"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      onRefresh={() => void feed.refetch()}
    >
      <ChipRow options={kinds} value={kind} onChange={setKind} />
      <FeedBody
        feed={feed}
        emptyTitle={kind === "all" ? "Nothing has happened yet" : "Nothing matches this filter"}
      />
    </Screen>
  );
}
