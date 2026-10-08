import { router } from "expo-router";
import { useProject } from "@/features/projects/slots/projectAdminApi";
import { Screen, ScreenHeader } from "@/ui";
import { useActivityFeed } from "../api";
import { FeedBody } from "../FeedBody";

export type ProjectActivityScreenProps = {
  projectId: number;
};

/** Everything that happened on one project, newest first (activity:view). */
export function ProjectActivityScreen({ projectId }: ProjectActivityScreenProps) {
  const project = useProject(projectId);
  const feed = useActivityFeed({ projectId });

  return (
    <Screen
      header={
        <ScreenHeader
          title="Activity"
          subtitle={project.data?.title}
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
      }
      refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      onRefresh={() => void feed.refetch()}
    >
      <FeedBody
        feed={feed}
        hideProject
        emptyTitle="Nothing has happened here yet"
        emptyText="Changes to the project, its requirements and its meetings show here."
      />
    </Screen>
  );
}
