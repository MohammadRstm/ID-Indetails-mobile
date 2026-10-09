import { Redirect } from "expo-router";
import { StatementScreen } from "@/features/billing/screens/StatementScreen";
import { useIdParam } from "@/navigation/params";

export default function StatementRoute() {
  const statementId = useIdParam("id");
  if (statementId == null) return <Redirect href="/not-available" />;
  return <StatementScreen statementId={statementId} />;
}
