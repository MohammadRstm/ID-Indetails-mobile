import { Redirect } from "expo-router";
import { EditRequirementScreen } from "@/features/requirements/manage/screens/EditRequirementScreen";
import { useIdParam } from "@/navigation/params";

export default function EditRequirementRoute() {
  const projectId = useIdParam("projectId");
  const requirementId = useIdParam("id");
  if (projectId == null) return <Redirect href="/not-available" />;
  return <EditRequirementScreen projectId={projectId} requirementId={requirementId} />;
}
