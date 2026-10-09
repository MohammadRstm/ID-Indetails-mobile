import { Redirect } from "expo-router";
import { WorkEntryScreen } from "@/features/work/screens/WorkEntryScreen";
import { useIdParam } from "@/navigation/params";

export default function WorkEntryRoute() {
  const entryId = useIdParam("id");
  if (entryId == null) return <Redirect href="/not-available" />;
  return <WorkEntryScreen entryId={entryId} />;
}
