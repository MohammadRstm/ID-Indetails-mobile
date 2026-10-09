import type { ReactNode } from "react";
import type { Meeting } from "@/api/types";
import { fmtDayDate, fmtRange } from "@/format/time";
import { useTheme } from "@/theme/ThemeProvider";
import { Icon, ListRow } from "@/ui";

type MeetingRowProps = {
  meeting: Meeting;
  /** Shows the day too (lists over several days). */
  withDay?: boolean;
  onPress?: () => void;
  divider?: boolean;
  trailing?: ReactNode;
};

/** A meeting in a list: its topic (or "Meeting"), project and times. */
export function MeetingRow({ meeting, withDay, onPress, divider, trailing }: MeetingRowProps) {
  const { colors } = useTheme();
  const when = fmtRange(meeting.startsAt, meeting.endsAt);
  return (
    <ListRow
      title={meeting.topic || "Meeting"}
      subtitle={`${meeting.project.title} · ${withDay ? `${fmtDayDate(meeting.startsAt)} · ` : ""}${when}`}
      leading={<Icon name="calendar" color={colors.accent} />}
      trailing={trailing}
      chevron={!!onPress}
      onPress={onPress}
      divider={divider}
    />
  );
}
