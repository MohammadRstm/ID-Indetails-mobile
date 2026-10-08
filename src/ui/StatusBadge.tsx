import type { ProjectStatus } from "@/api/types";
import { Badge, type BadgeTone } from "./Badge";

const STATUS: Record<ProjectStatus, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "ok" },
  hold: { label: "On hold", tone: "warn" },
  completed: { label: "Completed", tone: "done" },
  archived: { label: "Archived", tone: "arch" },
};

/** A project's status in the web's colours: Active ok, On hold warn, Completed done, Archived arch. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, tone } = STATUS[status] ?? { label: status, tone: "neutral" };
  return <Badge label={label} tone={tone} />;
}
