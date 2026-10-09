import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Client, ClientSummary, Paged } from "@/api/types";

/* Clients, read only. Every key starts with "clients", the web's area name, so a change elsewhere refreshes them by prefix. */

export const clientKeys = {
  list: (params: object) => ["clients", "list", params] as const,
  detail: (id: number) => ["clients", "detail", id] as const,
};

export type ClientListParams = { domain: string; search?: string };

/** One page of the domain's clients (the API's largest), by name. Archived ones only when asked for. */
export function useClients(params: ClientListParams) {
  const p = Object.fromEntries(
    Object.entries({ pageSize: 100, sort: "name", ...params }).filter(
      ([, v]) => v !== undefined && v !== "",
    ),
  );
  return useQuery({
    queryKey: clientKeys.list(p),
    queryFn: async () => (await http.get<Paged<ClientSummary>>("/clients", { params: p })).data,
    select: (page) => page.items,
    placeholderData: keepPreviousData,
  });
}

/** One client with their contacts; money only when the person holds financial:view. */
export function useClient(id: number) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => (await http.get<Client>(`/clients/${id}`)).data,
  });
}
