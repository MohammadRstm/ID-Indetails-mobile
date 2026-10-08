import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import { toApiError, ApiError } from "@/api/errors";
import type { Meeting, Schemas } from "@/api/types";

/*
 * Meetings of the projects the person can see. The API has no "one meeting" endpoint, so a meeting is found in a
 * list already loaded, or else in the full list.
 */

export type SaveMeetingBody = Schemas["SaveMeetingRequest"];
export type MeetingRange = { from?: string; to?: string; projectId?: number; mine?: boolean };

export const meetingKeys = {
  all: ["meetings"] as const,
  list: (range: MeetingRange) => ["meetings", "list", range] as const,
  project: (projectId: number) => ["meetings", "project", projectId] as const,
  one: (id: number) => ["meetings", "one", id] as const,
};

export function useMeetings(range: MeetingRange) {
  const params = Object.fromEntries(
    Object.entries(range).filter(([, v]) => v != null && v !== false),
  );
  return useQuery({
    queryKey: meetingKeys.list(range),
    queryFn: async () => (await http.get<Meeting[]>("/meetings", { params })).data,
  });
}

export function useProjectMeetings(projectId: number, enabled = true) {
  return useQuery({
    queryKey: meetingKeys.project(projectId),
    queryFn: async () => (await http.get<Meeting[]>(`/projects/${projectId}/meetings`)).data,
    enabled,
  });
}

/** One meeting, from any loaded list first; a meeting no list holds any more reads as 404. */
export function useMeeting(id: number) {
  const queryClient = useQueryClient();
  const cached = queryClient
    .getQueriesData<Meeting[]>({ queryKey: meetingKeys.all })
    .flatMap(([, list]) => (Array.isArray(list) ? list : []))
    .find((m) => m.id === id);
  return useQuery({
    queryKey: meetingKeys.one(id),
    queryFn: async () => {
      const all = (await http.get<Meeting[]>("/meetings")).data;
      const found = all.find((m) => m.id === id);
      if (!found) throw new ApiError(404, { code: "not_found", type: "not_found" });
      return found;
    },
    initialData: cached,
    retry: (failures, error) => toApiError(error).status >= 500 && failures < 2,
  });
}

function useMeetingsChanged() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    // A meeting shows on the person's day.
    void queryClient.invalidateQueries({ queryKey: ["work", "day"] });
  };
}

export function useCreateMeeting() {
  const changed = useMeetingsChanged();
  return useMutation({
    mutationFn: async ({ projectId, body }: { projectId: number; body: SaveMeetingBody }) =>
      (await http.post<Meeting>(`/projects/${projectId}/meetings`, body)).data,
    onSuccess: changed,
  });
}

export function useUpdateMeeting() {
  const changed = useMeetingsChanged();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: SaveMeetingBody }) =>
      (await http.put<Meeting>(`/meetings/${id}`, body)).data,
    onSuccess: changed,
  });
}

export function useDeleteMeeting() {
  const changed = useMeetingsChanged();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/meetings/${id}`);
    },
    onSuccess: changed,
  });
}
