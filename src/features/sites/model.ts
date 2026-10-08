import type { ProjectSummary, SiteSummary } from "@/api/types";
import { addDays, partsOf } from "@/format/time";

export type Site = { project: ProjectSummary; lastRecordedAt: string | null };

/**
 * The person's sites, as on the web's site cards: open sites only (active, then on hold), the ones they recorded
 * on most recently first, then the rest, newest first.
 */
export function orderSites(projects: ProjectSummary[], summaries: SiteSummary[]): Site[] {
  const last = new Map(summaries.map((s) => [s.projectId, s.myLastRecordedAt]));
  const rank = (p: ProjectSummary) => (p.status === "active" ? 0 : 1);
  return projects
    .filter((p) => p.status === "active" || p.status === "hold")
    .map((project) => ({ project, lastRecordedAt: last.get(project.id) ?? null }))
    .sort((a, b) => {
      if (rank(a.project) !== rank(b.project)) return rank(a.project) - rank(b.project);
      const la = a.lastRecordedAt;
      const lb = b.lastRecordedAt;
      if (la && lb) return lb.localeCompare(la);
      if (la || lb) return la ? -1 : 1;
      return b.project.startDate.localeCompare(a.project.startDate);
    });
}

/** The Monday of the site week a day is in: site weeks run Monday to Saturday, whatever the company's week. */
export function siteWeekStart(day: string): string {
  return addDays(day, -((partsOf(day).weekday + 6) % 7));
}
