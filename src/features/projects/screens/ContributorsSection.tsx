import { toApiError } from "@/api/errors";
import { InlineError, Section, Skeleton } from "@/ui";
import { useProjectWork } from "../api";
import { ContributorsList } from "../components/ContributorsList";

/** Who logged time on a Design project. Only drawn for people who may see everyone's work. */
export function ContributorsSection({ projectId }: { projectId: number }) {
  const work = useProjectWork(projectId, true);

  return (
    <Section title="Who worked">
      {work.data ? (
        <ContributorsList
          contributors={work.data.contributors}
          totalMinutes={work.data.totalMinutes}
          entryCount={work.data.entryCount}
        />
      ) : work.isError ? (
        <InlineError
          what="who worked"
          message={toApiError(work.error).message}
          onRetry={() => void work.refetch()}
        />
      ) : (
        <Skeleton lines={2} />
      )}
    </Section>
  );
}
