import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { MaterialList } from "@/api/types";

/*
 * A site's materials, read a page at a time (newest first, with its types and suppliers). Adding goes through
 * the outbox (src/offline), so it works without signal.
 */

export const materialKeys = {
  all: ["materials"] as const,
  site: (projectId: number) => ["materials", projectId] as const,
  list: (projectId: number) => ["materials", projectId, "list"] as const,
};

const PAGE = 30;

export function useSiteMaterials(projectId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: materialKeys.list(projectId),
    queryFn: async ({ pageParam }) =>
      (
        await http.get<MaterialList>(`/projects/${projectId}/materials`, {
          params: { page: pageParam, pageSize: PAGE },
        })
      ).data,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
    enabled,
  });
}
