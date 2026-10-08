import type { Href } from "expo-router";
import type { Schemas } from "@/api/types";

/*
 * Where the person asked from, so "this project" makes sense to Proton (the web's useProtonPageContext). The
 * screen that opens Proton passes the record it shows as route parameters; nothing else of the screen is sent.
 */

export type ProtonPageContext = Schemas["ProtonPageContext"];
type RefType = Schemas["ProtonRefType"];

const PAGE_OF: Record<RefType, NonNullable<Schemas["ProtonPage"]>> = {
  project: "projects",
  client: "clients",
  person: "people",
};

const AREAS = ["design", "execution"] as const;
const TYPES = ["project", "client", "person"] as const;

/** Proton, asked about one record. */
export function protonHrefFor(type: RefType, id: number, domain: string | null): Href {
  const params: Record<string, string> = { about: type, id: String(id) };
  if (domain) params.area = domain;
  return { pathname: "/proton", params } as Href;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The context Proton's screen was opened with, or null. Anything that doesn't fit is dropped. */
export function pageContextOf(
  params: Record<string, string | string[] | undefined>,
): ProtonPageContext | null {
  const area = AREAS.find((a) => a === first(params.area));
  const type = TYPES.find((t) => t === first(params.about));
  const idText = first(params.id);
  const id = idText && /^\d{1,15}$/.test(idText) ? Number(idText) : null;
  if (!area || !type || !id) return null;
  return { area, page: PAGE_OF[type], entityType: type, entityId: id, section: null };
}
