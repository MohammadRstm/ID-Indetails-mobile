import { AddMaterialsScreen } from "@/features/materials/screens/AddMaterialsScreen";
import { useIdParam } from "@/navigation/params";

export default function AddMaterialsRoute() {
  const projectId = useIdParam("projectId");
  return <AddMaterialsScreen projectId={projectId} />;
}
