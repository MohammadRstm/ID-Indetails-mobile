import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Device } from "@/api/types";

export const devicesKey = ["me", "devices"] as const;

/** The phones that receive the signed-in person's pushes, newest first; `current` marks this one. */
export function useDevices() {
  return useQuery({
    queryKey: devicesKey,
    queryFn: async () => (await http.get<Device[]>("/me/devices")).data,
  });
}

/** Signs another phone out: its session ends and its pushes stop. */
export function useSignOutDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/me/devices/${id}`);
    },
    // Also after a failure: a 404 means the phone is already gone from the list.
    onSettled: () => queryClient.invalidateQueries({ queryKey: devicesKey }),
  });
}
