import type { Href } from "expo-router";
import type { Schemas } from "@/api/types";
import type { Permissions } from "@/permissions/permissions";

/*
 * Where the person asked from, so "this project" makes sense to Proton (the web's useProtonPageContext). Proton is
 * a screen of its own, so the screen that opens it passes what it shows as route parameters: a record (and, on a
 * project, its section) or one of the phone's own pages. Nothing else of the screen is sent.
 */

export type ProtonPageContext = Schemas["ProtonPageContext"];
type ProtonPage = NonNullable<Schemas["ProtonPage"]>;
export type ProtonSection = NonNullable<Schemas["ProtonProjectSection"]>;

const AREAS = ["design", "execution", "company"] as const;
const RECORD_TYPES = ["project", "client", "person", "team"] as const;
type RecordType = (typeof RECORD_TYPES)[number];

/** The phone's pages that Proton knows by name, in the names it knows them by. */
const PHONE_PAGES = [
  "dashboard",
  "my_work",
  "my_pay",
  "messages",
  "notifications",
  "settings",
] as const satisfies readonly ProtonPage[];
export type PhonePage = (typeof PHONE_PAGES)[number];

const SECTIONS: readonly ProtonSection[] = [
  "financials",
  "overview",
  "analytics",
  "contributors",
  "requirements",
  "timeline",
  "meetings",
];

const PAGE_OF: Record<RecordType, ProtonPage> = {
  project: "projects",
  client: "clients",
  person: "people",
  team: "messages",
};

/** Proton, asked about one record (and, on a project, the part of it on screen). */
export function protonHrefFor(
  type: Exclude<RecordType, "team">,
  id: number,
  domain: string | null,
  section?: ProtonSection | null,
): Href {
  const params: Record<string, string> = { about: type, id: String(id) };
  if (domain) params.area = domain;
  if (section) params.section = section;
  return { pathname: "/proton", params } as Href;
}

/** Proton, asked from one of the phone's own pages. */
export function protonPageHref(page: PhonePage, domain: string | null): Href {
  const params: Record<string, string> = { page };
  if (domain) params.area = domain;
  return { pathname: "/proton", params } as Href;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The area asked from, or else the person's own: their domain, or the company for a super admin. */
function areaOf(param: string | undefined, perms: Permissions): ProtonPageContext["area"] | null {
  const given = AREAS.find((a) => a === param);
  if (given) return given;
  if (perms.homeDomain) return perms.homeDomain;
  return perms.isSuperAdmin ? "company" : (perms.visibleDomains[0] ?? null);
}

/**
 * The context Proton's screen was opened with, or null. Anything that doesn't fit is dropped. A chat is a
 * `person` or `team` record on the `messages` page.
 */
export function pageContextOf(
  params: Record<string, string | string[] | undefined>,
  perms: Permissions,
): ProtonPageContext | null {
  const type = RECORD_TYPES.find((t) => t === first(params.about));
  const idText = first(params.id);
  const id = idText && /^\d{1,15}$/.test(idText) ? Number(idText) : null;
  const record = type && id ? { type, id } : null;
  const named = PHONE_PAGES.find((p) => p === first(params.page));
  const area = areaOf(first(params.area), perms);
  if ((!record && !named) || !area) return null;
  return {
    area,
    page: named ?? (record ? PAGE_OF[record.type] : null),
    entityType: record?.type ?? null,
    entityId: record?.id ?? null,
    section:
      record?.type === "project"
        ? (SECTIONS.find((s) => s === first(params.section)) ?? null)
        : null,
    surface: null,
  };
}
