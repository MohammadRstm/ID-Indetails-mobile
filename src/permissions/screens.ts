import type { IconName } from "@/ui/icons";
import { P } from "./codes";
import type { Permissions } from "./permissions";

/*
 * Every route of the app, once: its path, its title, the permission rule it needs and its place in More.
 * The tab bar, the route guard, deep links, push targets and More all read this table, so a link and the
 * screen behind it can never disagree. The rules follow the web's route table (src/app/routing/routeTable.tsx)
 * and phase-0-plan.md section 15.
 *
 * Hiding a screen is a convenience: the API checks every request again.
 */

export type ScreenRule = (p: Permissions) => boolean;

export type Screen = {
  /** The Expo Router path, without groups, with its [params]. */
  pathname: string;
  title: string;
  rule: ScreenRule;
  /** Listed in More, with this icon, when it isn't already one of the person's tabs. */
  moreIcon?: IconName;
};

const signedIn: ScreenRule = () => true;
const all =
  (...codes: Parameters<Permissions["hasAll"]>): ScreenRule =>
  (p) =>
    p.hasAll(...codes);
const any =
  (...codes: Parameters<Permissions["hasAny"]>): ScreenRule =>
  (p) =>
    p.hasAny(...codes);
/** Built on logged hours, so Design only, as on the web. */
const designOnly =
  (rule: ScreenRule): ScreenRule =>
  (p) =>
    p.canSeeDomain("design") && rule(p);

const logsOwnWork = all(P.WORK_ENTRY_CREATE, P.WORK_ENTRY_VIEW_OWN);
const recordsMaterials = any(P.MATERIAL_CREATE, P.MATERIAL_MANAGE);
const reportsLabour = any(P.LABOUR_REPORT_CREATE, P.LABOUR_REPORT_MANAGE);

export const screens = {
  // tabs
  today: { pathname: "/today", title: "Today", rule: signedIn },
  work: { pathname: "/work", title: "Work", rule: logsOwnWork },
  sites: { pathname: "/sites", title: "Sites", rule: recordsMaterials, moreIcon: "building" },
  projects: {
    pathname: "/projects",
    title: "Projects",
    rule: all(P.PROJECT_VIEW),
    moreIcon: "projects",
  },
  messages: { pathname: "/messages", title: "Messages", rule: signedIn },
  alerts: { pathname: "/alerts", title: "Alerts", rule: signedIn },
  more: { pathname: "/more", title: "More", rule: signedIn },

  // the shell
  notAvailable: { pathname: "/not-available", title: "Not available", rule: signedIn },
  settings: { pathname: "/settings", title: "Settings", rule: signedIn, moreIcon: "settings" },
  devGallery: {
    pathname: "/dev/gallery",
    title: "UI gallery",
    rule: () => __DEV__,
    moreIcon: "grid",
  },

  // Design work (Phase 2)
  workEntry: { pathname: "/work/entry/[id]", title: "Entry", rule: all(P.WORK_ENTRY_VIEW_OWN) },
  logWork: { pathname: "/log-work", title: "Log work", rule: logsOwnWork },
  pay: {
    pathname: "/pay",
    title: "My pay",
    rule: designOnly(all(P.WORK_ENTRY_VIEW_OWN)),
    moreIcon: "card",
  },

  // sites, materials and labour (Phase 2)
  projectMaterials: {
    pathname: "/projects/[id]/materials",
    title: "Materials",
    rule: recordsMaterials,
  },
  addMaterials: { pathname: "/materials/add", title: "Add materials", rule: recordsMaterials },
  labourWeeks: { pathname: "/projects/[id]/labour", title: "Labour", rule: reportsLabour },
  labourWeek: {
    pathname: "/projects/[id]/labour/[weekStart]",
    title: "Labour week",
    rule: reportsLabour,
  },
  pending: {
    pathname: "/pending",
    title: "Pending records",
    rule: (p) => recordsMaterials(p) || reportsLabour(p),
    moreIcon: "refresh",
  },

  // projects and requirements (Phase 2)
  project: { pathname: "/projects/[id]", title: "Project", rule: all(P.PROJECT_VIEW) },
  projectRequirements: {
    pathname: "/projects/[id]/requirements",
    title: "Requirements",
    rule: all(P.PROJECT_VIEW, P.REQUIREMENT_VIEW),
  },
  myRequirements: {
    pathname: "/requirements",
    title: "My requirements",
    rule: all(P.REQUIREMENT_VIEW),
    moreIcon: "checkCircle",
  },

  // meetings (Phase 2)
  meetings: {
    pathname: "/meetings",
    title: "Meetings",
    rule: all(P.PROJECT_VIEW),
    moreIcon: "calendar",
  },
  newMeeting: {
    pathname: "/meetings/new",
    title: "New meeting",
    rule: all(P.PROJECT_VIEW, P.MEETING_CREATE),
  },
  meeting: { pathname: "/meetings/[id]", title: "Meeting", rule: all(P.PROJECT_VIEW) },

  // messages, notifications, profile (Phase 2)
  teamChat: { pathname: "/messages/team/[teamId]", title: "Team chat", rule: signedIn },
  directChat: { pathname: "/messages/direct/[userId]", title: "Chat", rule: signedIn },
  notificationSettings: {
    pathname: "/notifications/settings",
    title: "Notifications",
    rule: signedIn,
    moreIcon: "bell",
  },
  profile: { pathname: "/profile", title: "Profile", rule: signedIn, moreIcon: "user" },

  // admin (Phase 3)
  editRequirement: {
    pathname: "/requirements/edit",
    title: "Requirement",
    rule: all(P.REQUIREMENT_MANAGE),
  },
  projectActivity: {
    pathname: "/projects/[id]/activity",
    title: "Activity",
    rule: all(P.PROJECT_VIEW, P.ACTIVITY_VIEW),
  },
  activity: {
    pathname: "/activity",
    title: "Activity",
    rule: designOnly(all(P.ACTIVITY_VIEW)),
    moreIcon: "activity",
  },
  people: {
    pathname: "/people",
    title: "People",
    rule: designOnly(all(P.EMPLOYEE_VIEW)),
    moreIcon: "people",
  },
  person: { pathname: "/people/[id]", title: "Person", rule: all(P.EMPLOYEE_VIEW) },
  clients: {
    pathname: "/clients",
    title: "Clients",
    rule: all(P.CLIENT_VIEW),
    moreIcon: "briefcase",
  },
  client: { pathname: "/clients/[id]", title: "Client", rule: all(P.CLIENT_VIEW) },
  proton: { pathname: "/proton", title: "Proton", rule: all(P.PROTON_USE), moreIcon: "compass" },

  // super admin (Phase 4): money never shows without financial:view
  company: {
    pathname: "/company",
    title: "Company",
    rule: all(P.COMPANY_VIEW, P.FINANCIAL_VIEW),
    moreIcon: "chartTile",
  },
  companyAlerts: {
    pathname: "/company/alerts",
    title: "Money follow-ups",
    rule: all(P.FINANCIAL_VIEW),
    moreIcon: "alert",
  },
  invoices: {
    pathname: "/billing/invoices",
    title: "Invoices",
    rule: all(P.FINANCIAL_VIEW),
    moreIcon: "file",
  },
  invoice: { pathname: "/billing/invoices/[id]", title: "Invoice", rule: all(P.FINANCIAL_VIEW) },
  newPayment: {
    pathname: "/billing/payments/new",
    title: "Record a payment",
    rule: all(P.FINANCIAL_VIEW, P.PAYMENT_RECORD),
  },
  statement: {
    pathname: "/billing/statements/[id]",
    title: "Statement",
    rule: all(P.FINANCIAL_VIEW),
  },

  // native (Phase 5)
  devices: { pathname: "/settings/devices", title: "My devices", rule: signedIn },
} satisfies Record<string, Screen>;

export type ScreenKey = keyof typeof screens;

/** Whether this person may open a screen. */
export function canOpen(perms: Permissions, key: ScreenKey): boolean {
  return (screens[key] as Screen).rule(perms);
}

export type Persona =
  "design_employee" | "execution_employee" | "admin" | "super_admin" | "website_staff";

/** Which kind of person this is, for their tabs and their Today. Employees go by their home domain. */
export function persona(perms: Permissions): Persona {
  if (perms.isWebsiteStaff) return "website_staff";
  if (perms.isSuperAdmin) return "super_admin";
  if (perms.isAdmin) return "admin";
  const domain = perms.homeDomain ?? perms.visibleDomains[0] ?? "design";
  return domain === "execution" ? "execution_employee" : "design_employee";
}

export type TabKey = "today" | "work" | "sites" | "projects" | "messages" | "alerts" | "more";

export type Tab = { key: TabKey; label: string; icon: IconName };

const TAB_ICONS: Record<TabKey, IconName> = {
  today: "target",
  work: "clock",
  sites: "building",
  projects: "projects",
  messages: "chat",
  alerts: "bell",
  more: "menu",
};

// phase-0-plan.md section 4: each person's tabs, left to right.
const TABS_OF: Record<Persona, TabKey[]> = {
  design_employee: ["today", "work", "messages", "alerts", "more"],
  execution_employee: ["today", "sites", "messages", "alerts", "more"],
  admin: ["today", "projects", "messages", "alerts", "more"],
  super_admin: ["today", "projects", "messages", "alerts", "more"],
  website_staff: ["today", "messages", "alerts", "more"],
};

/** This person's tabs: their persona's, less any whose screen they can't open. */
export function tabsFor(perms: Permissions): Tab[] {
  const kind = persona(perms);
  return TABS_OF[kind]
    .filter((key) => canOpen(perms, key))
    .map((key) => {
      // A super admin's day is the company's: their first tab is "Company".
      if (key === "today" && kind === "super_admin") {
        return { key, label: "Company", icon: "chartTile" };
      }
      return { key, label: screens[key].title, icon: TAB_ICONS[key] };
    });
}
