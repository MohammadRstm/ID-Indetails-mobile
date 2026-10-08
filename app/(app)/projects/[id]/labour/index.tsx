import { Redirect } from "expo-router";
import { LabourWeeksScreen } from "@/features/labour/screens/LabourWeeksScreen";
import { useIdParam } from "@/navigation/params";

export default function LabourWeeksRoute() {
  const projectId = useIdParam("id");
  if (projectId == null) return <Redirect href="/not-available" />;
  return <LabourWeeksScreen projectId={projectId} />;
}
