import { router } from "expo-router";
import { toApiError } from "@/api/errors";
import { useProject } from "@/features/projects/api";
import { PendingRecordsList } from "@/features/sites/screens/PendingRecordsList";
import { fmtDate } from "@/format/time";
import { useOfflineBanner } from "@/offline/useOnline";
import { P } from "@/permissions/codes";
import { usePermissions } from "@/permissions/usePermissions";
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  ListRow,
  LoadError,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
} from "@/ui";
import { useSiteMaterials } from "../api";
import { quantityText } from "../model";

export type ProjectMaterialsScreenProps = {
  projectId: number;
};

function addMaterials(projectId: number) {
  router.push({ pathname: "/materials/add", params: { projectId: String(projectId) } });
}

/**
 * A site's materials, newest first, a page at a time, with what is still waiting on the phone. Costs are left out
 * on the phone; they are on the web.
 */
export function ProjectMaterialsScreen({ projectId }: ProjectMaterialsScreenProps) {
  const perms = usePermissions();
  const project = useProject(projectId);
  const materials = useSiteMaterials(projectId);
  const banner = useOfflineBanner(materials.dataUpdatedAt);
  const first = materials.data?.pages[0];
  const items = materials.data?.pages.flatMap((p) => p.items) ?? [];
  const canAdd = (first?.canAdd ?? true) && perms.has(P.MATERIAL_CREATE);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/sites"));

  return (
    <Screen
      header={
        <ScreenHeader
          title="Materials"
          subtitle={project.data?.title}
          onBack={back}
          actions={
            canAdd ? (
              <IconButton
                icon="plus"
                accessibilityLabel="Add materials"
                onPress={() => addMaterials(projectId)}
              />
            ) : null
          }
        />
      }
      banner={banner}
      refreshing={materials.isRefetching}
      onRefresh={() => void materials.refetch()}
    >
      <Section>
        <PendingRecordsList projectId={projectId} unsentOnly />
      </Section>
      {materials.isError && !materials.data ? (
        <LoadError
          what="the materials"
          message={toApiError(materials.error).message}
          traceId={toApiError(materials.error).traceId}
          onRetry={() => void materials.refetch()}
        />
      ) : !materials.data ? (
        <Skeleton lines={6} height={18} />
      ) : items.length === 0 ? (
        <EmptyState
          art="projects"
          title="No materials yet"
          text={canAdd ? "Add what was delivered to the site." : undefined}
          action={
            canAdd ? (
              <Button
                label="Add materials"
                icon="plus"
                variant="primary"
                onPress={() => addMaterials(projectId)}
              />
            ) : undefined
          }
        />
      ) : (
        <Section title={`${first?.totalCount ?? items.length} materials`}>
          <Card padded={false}>
            {items.map((m, i) => (
              <ListRow
                key={m.id}
                title={m.name}
                subtitle={[
                  quantityText(m.quantity, m.unit),
                  m.supplier,
                  `${m.addedBy.name} · ${fmtDate(m.addedOn)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                divider={i < items.length - 1}
              />
            ))}
          </Card>
          {materials.hasNextPage ? (
            <Button
              label="Show older materials"
              variant="quiet"
              loading={materials.isFetchingNextPage}
              onPress={() => void materials.fetchNextPage()}
            />
          ) : null}
        </Section>
      )}
    </Screen>
  );
}
