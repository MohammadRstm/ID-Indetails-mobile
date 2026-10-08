import { Redirect } from "expo-router";
import { ProjectRequirementsScreen } from "@/features/requirements/screens/ProjectRequirementsScreen";
import { useIdParam } from "@/navigation/params";

export default function ProjectRequirementsRoute() {
  const projectId = useIdParam("id");
  const highlightRequirementId = useIdParam("requirementId");
  if (projectId == null) return <Redirect href="/not-available" />;
  return (
    <ProjectRequirementsScreen
      projectId={projectId}
      highlightRequirementId={highlightRequirementId}
    />
  );
}
