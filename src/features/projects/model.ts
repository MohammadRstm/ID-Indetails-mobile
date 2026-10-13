import { P, type PermissionCode } from "@/permissions/codes";

/*
 * Which parts of a project the phone shows to whom, and in what order. The rules are the web's project tabs
 * (shared/projects/ProjectPage.tsx and ProjectRoute.tsx): Financials need financial:view; Analytics and
 * Contributors need work_entry:view_all; Overview is for people who log their own work, or who have neither
 * money nor everyone's work. The API checks every request again; this only decides what is drawn.
 */

/** The names a link may ask for; the same as the web's tabs. */
export const PROJECT_SECTION_KEYS = [
  "financials",
  "overview",
  "analytics",
  "contributors",
  "requirements",
  "timeline",
  "meetings",
] as const;

export type ProjectSectionKey = (typeof PROJECT_SECTION_KEYS)[number];

/** The parts of the page the phone draws, top to bottom. Analytics charts and the calendar Timeline stay on the web. */
const PHONE_ORDER = [
  "financials",
  "overview",
  "contributors",
  "requirements",
  "meetings",
] as const satisfies readonly ProjectSectionKey[];

export type PhoneSectionKey = (typeof PHONE_ORDER)[number];

export type ProjectAccess = {
  domain: string;
  /** The API gave this person the project's money. */
  hasMoney: boolean;
  has: (code: PermissionCode) => boolean;
};

/** The sections this person sees on this project, in the order they are drawn. */
export function projectSections({ domain, hasMoney, has }: ProjectAccess): PhoneSectionKey[] {
  const design = domain === "design";
  const allowed: Record<PhoneSectionKey, boolean> = {
    financials: has(P.FINANCIAL_VIEW) && hasMoney,
    overview: design
      ? has(P.WORK_ENTRY_VIEW_OWN) || (!has(P.FINANCIAL_VIEW) && !has(P.WORK_ENTRY_VIEW_ALL))
      : true,
    contributors: design && has(P.WORK_ENTRY_VIEW_ALL),
    requirements: has(P.REQUIREMENT_VIEW),
    meetings: true,
  };
  return PHONE_ORDER.filter((key) => allowed[key]);
}

/** The section a link asked for, when it is on the page; web-only and hidden sections leave the page at the top. */
export function sectionToShow(
  requested: ProjectSectionKey | null,
  shown: readonly PhoneSectionKey[],
): PhoneSectionKey | null {
  return shown.find((key) => key === requested) ?? null;
}
