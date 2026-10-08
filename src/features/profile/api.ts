import { useMutation, useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { CurrentUser, Schemas } from "@/api/types";

export type MyPermission = Schemas["MyPermissionResponse"];

export const profileKeys = {
  permissions: ["profile", "permissions"] as const,
};

/** Each permission the person holds or had removed, explained, and where it comes from. */
export function useMyPermissions() {
  return useQuery({
    queryKey: profileKeys.permissions,
    queryFn: async () => (await http.get<MyPermission[]>("/me/permissions")).data,
    staleTime: 5 * 60_000,
  });
}

/** Sets the profile photo from an upload of the person's own, or removes it (null). */
export function useSetMyPhoto() {
  return useMutation({
    mutationFn: async (fileId: number | null) =>
      (fileId == null
        ? await http.delete<CurrentUser>("/me/photo")
        : await http.put<CurrentUser>("/me/photo", { fileId })
      ).data,
  });
}
