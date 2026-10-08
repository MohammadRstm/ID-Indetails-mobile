import { Redirect } from "expo-router";
import { ProjectMaterialsScreen } from "@/features/materials/screens/ProjectMaterialsScreen";
import { useIdParam } from "@/navigation/params";

export default function ProjectMaterialsRoute() {
  const projectId = useIdParam("id");
  if (projectId == null) return <Redirect href="/not-available" />;
  return <ProjectMaterialsScreen projectId={projectId} />;
}
