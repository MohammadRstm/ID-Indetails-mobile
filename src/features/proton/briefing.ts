import type { Href } from "expo-router";
import type { Permissions } from "@/permissions/permissions";
import type { ProtonBriefing } from "./api";
import { areaLabel } from "./cards";
import { hrefOfRef } from "./refs";

/** One thing worth a look, as the welcome shows it: the project (or business) and its most pressing fact. */
export type BriefingRowData = {
  key: string;
  name: string;
  fact: string;
  /** How many more facts the item has beyond `fact`. */
  extra: number;
  /** The project's screen when it has one and this person may open it. */
  href: Href | null;
};

/** The briefing's items as rows. An item with nothing to say is left out. */
export function briefingRows(briefing: ProtonBriefing | undefined, perms: Permissions) {
  const rows: BriefingRowData[] = [];
  (briefing?.items ?? []).forEach((item, i) => {
    if (item.facts.length === 0) return;
    rows.push({
      key: item.project ? `project-${item.project.id}` : `area-${i}`,
      name: item.project?.name ?? areaLabel(item.domain) ?? "Company",
      fact: item.facts[0],
      extra: item.facts.length - 1,
      href: item.project ? hrefOfRef(item.project, perms) : null,
    });
  });
  return rows;
}
