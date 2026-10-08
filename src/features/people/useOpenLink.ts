import { Linking } from "react-native";
import { toast } from "@/ui";

/** Opens a tel:, mailto: or WhatsApp link, and says so when the phone has nothing to open it with. */
export function openLink(url: string) {
  Linking.openURL(url).catch(() =>
    toast({ text: "Couldn't open that on this phone", icon: "alert" }),
  );
}
