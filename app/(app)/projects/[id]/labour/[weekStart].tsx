import { Redirect } from "expo-router";
import { LabourWeekScreen } from "@/features/labour/screens/LabourWeekScreen";
import { useDayParam, useIdParam } from "@/navigation/params";

export default function LabourWeekRoute() {
  const projectId = useIdParam("id");
  const weekStart = useDayParam("weekStart");
  if (projectId == null || weekStart == null) return <Redirect href="/not-available" />;
  return <LabourWeekScreen projectId={projectId} weekStart={weekStart} />;
}
