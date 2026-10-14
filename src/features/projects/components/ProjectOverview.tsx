import { Bar, Button, Card, Section } from "@/ui";

type ProjectOverviewProps = {
  progressPct: number;
  /** Set when the person may log work on this project. */
  onLogWork?: () => void;
};

/** A project's progress bar and, for people who log hours, the way to log some. */
export function ProjectOverview({ progressPct, onLogWork }: ProjectOverviewProps) {
  return (
    <Section title="Overview">
      <Card>
        <Bar value={progressPct / 100} accessibilityLabel={`Progress, ${progressPct}% done`} />
      </Card>
      {onLogWork ? (
        <Button
          label="Log work on this project"
          icon="plus"
          variant="primary"
          fullWidth
          onPress={onLogWork}
        />
      ) : null}
    </Section>
  );
}
