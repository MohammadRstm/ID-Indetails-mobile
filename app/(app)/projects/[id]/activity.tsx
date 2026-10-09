import { Redirect } from "expo-router";
import { ProjectActivityScreen } from "@/features/activity/screens/ProjectActivityScreen";
import { useIdParam } from "@/navigation/params";

export default function ProjectActivityRoute() {
  const projectId = useIdParam("id");
  if (projectId == null) return <Redirect href="/not-available" />;
  return <ProjectActivityScreen projectId={projectId} />;
}
