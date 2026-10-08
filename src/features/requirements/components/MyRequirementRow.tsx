import type { Schemas } from "@/api/types";
import { fmtDate } from "@/format/time";
import { Badge, ListRow } from "@/ui";

type MyRequirement = Schemas["MyRequirementResponse"];

/** "Overdue 2 days", "Due today", "Due in 3 days", or the date further out. */
export function deadlineLabel(
  r: Pick<MyRequirement, "deadline" | "daysLeft" | "isOverdue">,
): string | null {
  if (!r.deadline || r.daysLeft == null) return null;
  if (r.isOverdue) return `Overdue ${-r.daysLeft} day${r.daysLeft === -1 ? "" : "s"}`;
  if (r.daysLeft === 0) return "Due today";
  if (r.daysLeft === 1) return "Due tomorrow";
  if (r.daysLeft <= 7) return `Due in ${r.daysLeft} days`;
  return `Due ${fmtDate(r.deadline)}`;
}

type MyRequirementRowProps = {
  requirement: MyRequirement;
  onPress?: () => void;
  divider?: boolean;
};

/** One of the person's open requirements: the text, its project and its deadline. */
export function MyRequirementRow({ requirement, onPress, divider }: MyRequirementRowProps) {
  const label = deadlineLabel(requirement);
  const soon = requirement.daysLeft != null && requirement.daysLeft <= 1;
  return (
    <ListRow
      title={requirement.text}
      subtitle={requirement.project.title}
      trailing={
        label ? (
          <Badge label={label} tone={requirement.isOverdue ? "now" : soon ? "warn" : "neutral"} />
        ) : undefined
      }
      onPress={onPress}
      divider={divider}
    />
  );
}
