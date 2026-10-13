import type { Href } from "expo-router";
import type { PushTarget } from "@/api/mobileTypes";
import type { ProtonUiCommand } from "@/api/types";
import type { Permissions } from "@/permissions/permissions";
import { canOpen, type ScreenKey } from "@/permissions/screens";

/*
 * One mapping from a semantic target to a screen (phase-0-plan.md section 9), for push taps, the notification
 * list, Proton's commands and links. Nothing is taken on trust: a bad id, a domain the person can't see or a
 * screen their permissions refuse all give null, and the caller opens Alerts instead. Links only open screens.
 */

export const isId = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The screen's href when this person may open it, otherwise null. */
function open(
  perms: Permissions,
  key: ScreenKey,
  pathname: string,
  params?: Record<string, string>,
): Href | null {
  if (!canOpen(perms, key)) return null;
  return (params ? { pathname, params } : pathname) as Href;
}

const PROJECT_SECTIONS = {
  requirements: { key: "projectRequirements", pathname: "/projects/[id]/requirements" },
  materials: { key: "projectMaterials", pathname: "/projects/[id]/materials" },
  labour: { key: "labourWeeks", pathname: "/projects/[id]/labour" },
} as const satisfies Record<string, { key: ScreenKey; pathname: string }>;

// Parts of the project screen itself; it scrolls to the one asked for and ignores one the person can't see.
const PROJECT_SCREEN_SECTIONS = ["financials", "overview", "contributors", "meetings"] as const;

function project(perms: Permissions, id: unknown, domain: unknown, section?: unknown): Href | null {
  if (!isId(id) || typeof domain !== "string" || !perms.canSeeDomain(domain)) return null;
  const params = { id: String(id) };
  // Requirements, materials and labour have screens of their own with the full lists.
  if (section === "requirements" || section === "materials" || section === "labour") {
    const { key, pathname } = PROJECT_SECTIONS[section];
    return open(perms, key, pathname, params);
  }
  const onScreen = PROJECT_SCREEN_SECTIONS.find((s) => s === section);
  return open(
    perms,
    "project",
    "/projects/[id]",
    onScreen ? { ...params, section: onScreen } : params,
  );
}

const PAGES = {
  notifications: { key: "alerts", pathname: "/alerts" },
  today: { key: "today", pathname: "/today" },
  work: { key: "work", pathname: "/work" },
  meetings: { key: "meetings", pathname: "/meetings" },
  company: { key: "company", pathname: "/company" },
} as const satisfies Record<string, { key: ScreenKey; pathname: string }>;

/** Where a push, a notification or a link about this target opens, or null when it can't be opened here. */
export function routeForTarget(target: PushTarget, perms: Permissions): Href | null {
  switch (target.type) {
    case "project":
      return project(perms, target.id, target.domain, target.section);
    // The project's requirements, scrolled to this one and highlighted.
    case "requirement":
      if (!isId(target.projectId) || !isId(target.requirementId)) return null;
      if (!perms.canSeeDomain(target.domain)) return null;
      return open(perms, "projectRequirements", "/projects/[id]/requirements", {
        id: String(target.projectId),
        requirementId: String(target.requirementId),
      });
    case "work_entry":
      return isId(target.id)
        ? open(perms, "workEntry", "/work/entry/[id]", { id: String(target.id) })
        : null;
    case "conversation":
      if (isId(target.teamId)) {
        return open(perms, "teamChat", "/messages/team/[teamId]", {
          teamId: String(target.teamId),
        });
      }
      if (isId(target.userId)) {
        return open(perms, "directChat", "/messages/direct/[userId]", {
          userId: String(target.userId),
        });
      }
      return null;
    case "labour_week":
      return isId(target.projectId) &&
        typeof target.weekStart === "string" &&
        DAY.test(target.weekStart)
        ? open(perms, "labourWeek", "/projects/[id]/labour/[weekStart]", {
            id: String(target.projectId),
            weekStart: target.weekStart,
          })
        : null;
    case "person":
      return isId(target.id)
        ? open(perms, "person", "/people/[id]", { id: String(target.id) })
        : null;
    case "client":
      return isId(target.id)
        ? open(perms, "client", "/clients/[id]", { id: String(target.id) })
        : null;
    case "invoice":
      return isId(target.id)
        ? open(perms, "invoice", "/billing/invoices/[id]", { id: String(target.id) })
        : null;
    // A payment is shown on its invoices; the phone has no payment screen, so it opens the invoice list.
    case "payment":
      return isId(target.id) ? open(perms, "invoices", "/billing/invoices") : null;
    case "statement":
      return isId(target.id)
        ? open(perms, "statement", "/billing/statements/[id]", { id: String(target.id) })
        : null;
    case "page": {
      const page = Object.hasOwn(PAGES, target.page) ? PAGES[target.page] : null;
      return page ? open(perms, page.key, page.pathname) : null;
    }
    default:
      return null;
  }
}

// Proton's pages and where they live on the phone. Reports, company expenses, help and the company tools stay on the web.
const PROTON_PAGES: Record<
  NonNullable<ProtonUiCommand["page"]>,
  { key: ScreenKey; pathname: string } | null
> = {
  dashboard: { key: "today", pathname: "/today" },
  projects: { key: "projects", pathname: "/projects" },
  clients: { key: "clients", pathname: "/clients" },
  people: { key: "people", pathname: "/people" },
  financials: { key: "company", pathname: "/company" },
  meetings: { key: "meetings", pathname: "/meetings" },
  activity: { key: "activity", pathname: "/activity" },
  company_overview: { key: "company", pathname: "/company" },
  reports: null,
  company_expenses: null,
  settings: { key: "settings", pathname: "/settings" },
  notifications: { key: "alerts", pathname: "/alerts" },
  messages: { key: "messages", pathname: "/messages" },
  my_work: { key: "work", pathname: "/work" },
  my_pay: { key: "pay", pathname: "/pay" },
  my_profile: { key: "profile", pathname: "/profile" },
  help: null,
  schedules: null,
  salaries: null,
  project_pay: null,
  proton_budget: null,
  company_settings: null,
  company_profile: null,
  launcher: null,
};

/**
 * Where a form or dialog Proton names opens on the phone, or null: the surfaces the phone has no screen for
 * stay on the web. Only the screen opens; nothing is filled or saved. `id` is the person or team of a chat.
 */
export function routeForProtonSurface(
  ask: Pick<ProtonUiCommand, "surface" | "id" | "domain">,
  perms: Permissions,
): Href | null {
  if (ask.domain != null && !perms.canSeeDomain(ask.domain)) return null;
  switch (ask.surface) {
    // Logged hours are Design's only, as on the web.
    case "log_work":
      return perms.canSeeDomain("design") ? open(perms, "logWork", "/log-work") : null;
    case "new_meeting":
      return open(perms, "newMeeting", "/meetings/new");
    case "message_person":
      return routeForTarget({ type: "conversation", userId: ask.id ?? undefined }, perms);
    case "message_team":
      return routeForTarget({ type: "conversation", teamId: ask.id ?? undefined }, perms);
    case "record_payment":
      return open(perms, "newPayment", "/billing/payments/new");
    case "settings_section":
      return open(perms, "settings", "/settings");
    default:
      return null;
  }
}

/**
 * Where one of Proton's navigation commands opens on the phone, or null ("refresh", a display choice, a form
 * fill, or nothing to open here). The API sends names, never addresses; the route is built here from the app's
 * own screen table.
 */
export function routeForProtonCommand(cmd: ProtonUiCommand, perms: Permissions): Href | null {
  switch (cmd.type) {
    case "open_surface":
      return routeForProtonSurface(cmd, perms);
    case "open_project":
      return project(perms, cmd.id, cmd.domain, cmd.section);
    case "open_client":
      return isId(cmd.id) && (cmd.domain == null || perms.canSeeDomain(cmd.domain))
        ? open(perms, "client", "/clients/[id]", { id: String(cmd.id) })
        : null;
    case "open_person":
      return isId(cmd.id) && (cmd.domain == null || perms.canSeeDomain(cmd.domain))
        ? open(perms, "person", "/people/[id]", { id: String(cmd.id) })
        : null;
    case "open_page": {
      const page =
        cmd.page != null && Object.hasOwn(PROTON_PAGES, cmd.page) ? PROTON_PAGES[cmd.page] : null;
      if (!page) return null;
      if (cmd.domain != null && !perms.canSeeDomain(cmd.domain)) return null;
      return open(perms, page.key, page.pathname);
    }
    default:
      return null;
  }
}
