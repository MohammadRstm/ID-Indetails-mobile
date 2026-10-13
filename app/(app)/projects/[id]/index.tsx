import { Redirect } from "expo-router";
import { PROJECT_SECTION_KEYS } from "@/features/projects/model";
import { ProjectScreen } from "@/features/projects/screens/ProjectScreen";
import { useChoiceParam, useIdParam } from "@/navigation/params";

export default function ProjectRoute() {
  const projectId = useIdParam("id");
  const section = useChoiceParam("section", PROJECT_SECTION_KEYS);
  if (projectId == null) return <Redirect href="/not-available" />;
  return <ProjectScreen projectId={projectId} section={section} />;
}
