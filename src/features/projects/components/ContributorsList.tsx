import { useState } from "react";
import type { Schemas } from "@/api/types";
import { fmtDur, fmtH, relDay } from "@/format/time";
import { Avatar, Card, ListRow, Text } from "@/ui";

export type Contributor = Pick<
  Schemas["ProjectContributorResponse"],
  "userId" | "name" | "minutes" | "overtimeMinutes" | "entries" | "sharePct" | "lastStartedAt"
>;

type ContributorsListProps = {
  contributors: Contributor[];
  totalMinutes: number;
  entryCount: number;
};

const SHOWN = 6;

const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
const entries = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`;

/** Who put hours into a project, most first, with their share. Hours only: pay and cost stay on the web. */
export function ContributorsList({
  contributors,
  totalMinutes,
  entryCount,
}: ContributorsListProps) {
  const [showAll, setShowAll] = useState(false);

  if (contributors.length === 0) {
    return (
      <Text variant="small" tone="muted">
        Nobody has logged time on this project yet.
      </Text>
    );
  }

  const ranked = [...contributors].sort((a, b) => b.minutes - a.minutes);
  const shown = showAll ? ranked : ranked.slice(0, SHOWN);
  const hidden = ranked.length - shown.length;

  return (
    <>
      <Text variant="small" tone="muted">
        {`${people(ranked.length)} · ${entries(entryCount)} · ${fmtH(totalMinutes)}`}
      </Text>
      <Card padded={false}>
        {shown.map((c, i) => (
          <ListRow
            key={c.userId}
            title={c.name}
            subtitle={[
              `${c.sharePct}% of the hours`,
              entries(c.entries),
              c.overtimeMinutes > 0 ? `${fmtDur(c.overtimeMinutes)} overtime` : null,
              `last ${relDay(c.lastStartedAt)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
            leading={<Avatar name={c.name} size={32} />}
            trailing={<Text variant="mono">{fmtDur(c.minutes)}</Text>}
            divider={i < shown.length - 1 || hidden > 0}
          />
        ))}
        {hidden > 0 ? (
          <ListRow title={`${hidden} more`} chevron onPress={() => setShowAll(true)} />
        ) : null}
      </Card>
    </>
  );
}
