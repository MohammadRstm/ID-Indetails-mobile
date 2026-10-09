import { router } from "expo-router";
import { toApiError } from "@/api/errors";
import type { Schemas } from "@/api/types";
import { useOfflineBanner } from "@/offline/useOnline";
import { Card, EmptyState, LoadError, Screen, ScreenHeader, Section, Skeleton } from "@/ui";
import { StatTiles } from "@/features/work/components/StatTiles";
import { useMyRequirements } from "../api";
import { MyRequirementRow } from "../components/MyRequirementRow";

type MyRequirement = Schemas["MyRequirementResponse"];

function groupsOf(items: MyRequirement[]) {
  return [
    { title: "Overdue", items: items.filter((r) => r.isOverdue) },
    {
      title: "Due within a week",
      items: items.filter((r) => !r.isOverdue && r.daysLeft != null && r.daysLeft <= 7),
    },
    { title: "Later", items: items.filter((r) => r.daysLeft != null && r.daysLeft > 7) },
    { title: "No deadline", items: items.filter((r) => r.deadline == null) },
  ].filter((g) => g.items.length > 0);
}

/** The requirements assigned to me, on active and on-hold projects, soonest deadline first. */
export function MyRequirementsScreen() {
  const mine = useMyRequirements();
  const banner = useOfflineBanner(mine.dataUpdatedAt);

  return (
    <Screen
      header={
        <ScreenHeader
          title="My requirements"
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/today"))}
        />
      }
      banner={banner}
      refreshing={mine.isRefetching}
      onRefresh={() => void mine.refetch()}
    >
      {mine.isError && !mine.data ? (
        <LoadError
          what="your requirements"
          message={toApiError(mine.error).message}
          traceId={toApiError(mine.error).traceId}
          onRetry={() => void mine.refetch()}
        />
      ) : !mine.data ? (
        <Skeleton lines={6} height={18} />
      ) : (
        <>
          <Section>
            <StatTiles
              stats={[
                { label: "Overdue", value: String(mine.data.overdue) },
                { label: "Due soon", value: String(mine.data.dueSoon) },
                { label: "Done", value: String(mine.data.done) },
              ]}
            />
          </Section>
          {mine.data.items.length === 0 ? (
            <EmptyState
              art="done"
              title="No requirements assigned to you"
              text="Enjoy the quiet."
            />
          ) : (
            groupsOf(mine.data.items).map((group) => (
              <Section key={group.title} title={`${group.title} · ${group.items.length}`}>
                <Card padded={false}>
                  {group.items.map((r, i) => (
                    <MyRequirementRow
                      key={r.id}
                      requirement={r}
                      divider={i < group.items.length - 1}
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
            ))
          )}
        </>
      )}
    </Screen>
  );
}
