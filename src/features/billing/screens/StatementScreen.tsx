import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

export type StatementScreenProps = {
  statementId: number;
};

/** One statement. Placeholder until Phase 4 builds it. */
export function StatementScreen(props: StatementScreenProps) {
  return <PlaceholderScreen title="Statement" phase="4" />;
}
