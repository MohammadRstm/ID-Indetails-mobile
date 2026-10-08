import { Redirect } from "expo-router";
import { ProjectScreen } from "@/features/projects/screens/ProjectScreen";
import { useChoiceParam, useIdParam } from "@/navigation/params";

export default function ProjectRoute() {
  const projectId = useIdParam("id");
  const section = useChoiceParam("section", ["meetings"] as const);
  if (projectId == null) return <Redirect href="/not-available" />;
  return <ProjectScreen projectId={projectId} section={section} />;
}
