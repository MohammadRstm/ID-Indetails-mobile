import { Redirect } from "expo-router";
import { useSession } from "@/auth/session";
import { BootScreen } from "@/features/shell/screens/BootScreen";

export default function Index() {
  const { status } = useSession();
  if (status === "loading") return <BootScreen />;
  return <Redirect href={status === "signedIn" ? "/today" : "/sign-in"} />;
}
