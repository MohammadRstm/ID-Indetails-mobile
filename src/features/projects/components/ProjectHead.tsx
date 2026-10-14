import type { ProjectStatus } from "@/api/types";
import { Card, Section, StatusBadge, Text } from "@/ui";

type ProjectHeadProps = {
  status: ProjectStatus;
  progressPct: number;
  /** Owner, dates and place, already worded. */
  facts: string;
  description: string | null;
};

/** What every person sees first about a project: its status and how far along it is, who owns it, and what it is. */
export function ProjectHead({ status, progressPct, facts, description }: ProjectHeadProps) {
  return (
    <Section>
      <Card>
        <StatusBadge status={status} />
        <Text variant="small" tone="secondary">
          {progressPct}% done
        </Text>
        <Text variant="small" tone="muted">
          {facts}
        </Text>
        {description ? <Text>{description}</Text> : null}
      </Card>
    </Section>
  );
}
