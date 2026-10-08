import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type LabourWeekScreenProps = {
  projectId: number;
  /** The week's first day, "yyyy-MM-dd". */
  weekStart: string;
};

/** One labour week of a site. Placeholder until Phase 2 builds it. */
export function LabourWeekScreen(props: LabourWeekScreenProps) {
  return <PlaceholderScreen title="Labour week" phase="2" />;
}
